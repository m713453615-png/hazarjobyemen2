#!/usr/bin/env node
/**
 * Codex review helper for the Hazar-Job.com pipeline.
 *
 * Sends the current pull-request diff to an OpenAI-compatible chat completions
 * endpoint and stores the review as a pull-request comment.
 *
 * The script is intentionally defensive: when no API key is configured, or when
 * the remote call fails, it reports the problem and exits with code 0 so that a
 * failing third-party service never breaks the build.
 *
 * Required environment variables (all optional, the script no-ops without them):
 *   CODEX_API_KEY  - API key for the provider.
 *   CODEX_API_URL  - Base URL of the API (default: https://api.openai.com/v1).
 *   CODEX_MODEL    - Model identifier (default: gpt-4o-mini).
 *   GITHUB_TOKEN   - Token used to publish the comment on a pull request.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const apiKey = (process.env.CODEX_API_KEY || '').trim()
const apiUrl = (process.env.CODEX_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '')
const model = (process.env.CODEX_MODEL || 'gpt-4o-mini').trim()
const githubToken = (process.env.GITHUB_TOKEN || '').trim()
const outputPath = (process.env.CODEX_OUTPUT_PATH || 'codex-review.md').trim()

function log(message) {
  console.log(`[codex] ${message}`)
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function readPullRequestDiff() {
  try {
    return run('git', ['diff', '--unified=3', 'origin/main...HEAD'])
  } catch {
    try {
      return run('git', ['diff', '--unified=3', 'HEAD~1...HEAD'])
    } catch {
      return ''
    }
  }
}

async function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) return null
  try {
    return JSON.parse(await readFile(eventPath, 'utf8'))
  } catch {
    return null
  }
}

async function requestReview(diff) {
  const response = await fetch(`${apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous senior engineer reviewing a pull request for the Hazar-Job.com '
            + 'Arabic RTL job platform (React + TypeScript + Vite + Express + Cloudflare Worker). '
            + 'Report concrete bugs, security issues, and breaking changes. Be concise and use Markdown.',
        },
        {
          role: 'user',
          content: `Review the following diff:\n\n${diff.slice(0, 60000) || '(no diff available)'}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Codex API responded with ${response.status}: ${await response.text()}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Codex API returned an empty review')
  }
  return content.trim()
}

async function publishComment(pullRequestNumber, review) {
  if (!githubToken || !pullRequestNumber) {
    log('GITHUB_TOKEN or pull request number missing, skipping the comment step')
    return
  }
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY || ''}/issues/${pullRequestNumber}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken}`,
      'User-Agent': 'hazar-job-codex-review',
    },
    body: JSON.stringify({ body: `## مراجعة Codex\n\n${review}` }),
  })
  if (!response.ok) {
    throw new Error(`GitHub comment failed with ${response.status}: ${await response.text()}`)
  }
  log(`review published on pull request #${pullRequestNumber}`)
}

async function main() {
  if (!apiKey) {
    log('CODEX_API_KEY is not configured, skipping the review')
    return
  }

  const event = await readEventPayload()
  const pullRequestNumber = event?.pull_request?.number
  const diff = readPullRequestDiff()

  if (!diff.trim()) {
    log('no diff found, skipping the review')
    return
  }

  try {
    const review = await requestReview(diff)
    await mkdir(dirname(resolve(outputPath)), { recursive: true })
    await writeFile(outputPath, review, 'utf8')
    log(`review written to ${outputPath}`)
    await publishComment(pullRequestNumber, review)
  } catch (error) {
    log(`review failed without breaking the build: ${error instanceof Error ? error.message : String(error)}`)
  }
}

main().catch(error => {
  log(`unexpected failure: ${error instanceof Error ? error.message : String(error)}`)
})
