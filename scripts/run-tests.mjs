#!/usr/bin/env node
/**
 * Portable test runner.
 *
 * The test runner of Node 20 does not expand glob patterns, and a quoted glob
 * is not expanded by the shell either. The test files are therefore discovered
 * here and imported directly, which behaves the same way on every supported
 * platform and on every Node version. The process exits with a non zero code
 * as soon as one test fails.
 */

import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const testDirectory = join(projectRoot, 'test')

const testFiles = readdirSync(testDirectory)
  .filter(name => name.endsWith('.test.ts'))
  .sort()

if (!testFiles.length) {
  console.error('No test files were found in the test directory.')
  process.exit(1)
}

for (const name of testFiles) {
  await import(pathToFileURL(join(testDirectory, name)).href)
}
