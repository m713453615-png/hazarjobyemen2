import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

const ownerToken = 'test-owner-sync-key'
const workDir = mkdtempSync(join(tmpdir(), 'hazar-job-test-'))

// The server reads its configuration while the module is evaluated, so the
// environment has to be prepared before the module is imported.
process.env.HAZAR_DATA_FILE = join(workDir, 'hazar-data.json')
process.env.HAZAR_OWNER_TOKEN = ownerToken

const { app } = await import('../server/index.ts')

let server: Server
let baseUrl = ''

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  return response
}

before(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()))
  })
  rmSync(workDir, { recursive: true, force: true })
})

describe('public API', () => {
  it('answers the health probe', async () => {
    const response = await request('/api/health')
    assert.equal(response.status, 200)
    const payload = await response.json() as { ok: boolean; service: string }
    assert.equal(payload.ok, true)
    assert.match(payload.service, /Hazar-Job\.com/)
  })

  it('returns a complete snapshot', async () => {
    const response = await request('/api/snapshot')
    assert.equal(response.status, 200)
    const payload = await response.json() as { jobs: unknown[]; applicants: unknown[]; settings: Record<string, unknown> }
    assert.ok(Array.isArray(payload.jobs) && payload.jobs.length > 0, 'snapshot must contain jobs')
    assert.ok(Array.isArray(payload.applicants) && payload.applicants.length > 0, 'snapshot must contain applicants')
    assert.ok(payload.settings.platformNameAr, 'snapshot must contain the platform settings')
  })

  it('sorts applicants by match score', async () => {
    const response = await request('/api/snapshot')
    const payload = await response.json() as { applicants: { match: number }[] }
    const scores = payload.applicants.map(applicant => applicant.match)
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a))
  })

  it('answers the CORS preflight', async () => {
    const response = await request('/api/snapshot', { method: 'OPTIONS' })
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), '*')
  })

  it('accepts a new job and always keeps it unpublished', async () => {
    const response = await request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ id: 9001, title: 'وظيفة اختبار', company: 'شركة الاختبار', verified: true }),
    })
    assert.equal(response.status, 201)
    const job = await response.json() as { id: number; verified: boolean }
    assert.equal(job.id, 9001)
    assert.equal(job.verified, false, 'a posted job must wait for owner approval')
  })
})

describe('owner protected API', () => {
  it('rejects a job update without the owner key', async () => {
    const response = await request('/api/jobs/1', {
      method: 'PATCH',
      body: JSON.stringify({ verified: true }),
    })
    assert.equal(response.status, 401)
  })

  it('rejects a job deletion without the owner key', async () => {
    const response = await request('/api/jobs/1', { method: 'DELETE' })
    assert.equal(response.status, 401)
  })

  it('rejects a settings update without the owner key', async () => {
    const response = await request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ jobPrice: '1' }),
    })
    assert.equal(response.status, 401)
  })

  it('updates a job with the owner key', async () => {
    const response = await request('/api/jobs/1', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ verified: false }),
    })
    assert.equal(response.status, 200)
    const job = await response.json() as { id: number }
    assert.equal(job.id, 1)
  })

  it('updates the platform settings with the owner key', async () => {
    const response = await request('/api/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ jobPrice: '7500' }),
    })
    assert.equal(response.status, 200)
    const settings = await response.json() as { jobPrice: string }
    assert.equal(settings.jobPrice, '7500')
  })

  it('persists the changes to disk', async () => {
    const response = await request('/api/settings')
    const settings = await response.json() as { jobPrice: string }
    assert.equal(settings.jobPrice, '7500')
  })

  it('updates an applicant status', async () => {
    const response = await request('/api/applicants/101/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'accepted' }),
    })
    assert.equal(response.status, 200)
    const applicant = await response.json() as { id: number; status: string }
    assert.equal(applicant.id, 101)
    assert.equal(applicant.status, 'accepted')
  })

  it('returns a not found payload for an unknown route', async () => {
    const response = await request('/api/unknown-route')
    assert.equal(response.status, 404)
  })
})

describe('company licenses', () => {
  it('rejects an incomplete license request', async () => {
    const response = await request('/api/licenses', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'شركة ناقصة' }),
    })
    assert.equal(response.status, 400)
  })

  it('accepts a license request in the review state', async () => {
    const response = await request('/api/licenses', {
      method: 'POST',
      body: JSON.stringify({
        id: 4242,
        companyName: 'شركة الأمل التجارية',
        legalType: 'شركة',
        licenseNumber: '12345',
        imageData: 'data:image/png;base64,iVBORw0KGgo=',
        imageName: 'license.png',
      }),
    })
    assert.equal(response.status, 201)
    const license = await response.json() as { id: number; status: string; companyName: string }
    assert.equal(license.id, 4242)
    assert.equal(license.status, 'review', 'a new request always waits for the owner')
    assert.equal(license.companyName, 'شركة الأمل التجارية')
  })

  it('hides the license list from visitors without the owner key', async () => {
    const response = await request('/api/licenses')
    assert.equal(response.status, 401)
  })

  it('returns the license list to the owner', async () => {
    const response = await request('/api/licenses', { headers: { Authorization: `Bearer ${ownerToken}` } })
    assert.equal(response.status, 200)
    const licenses = await response.json() as { id: number }[]
    assert.equal(licenses.length, 1)
    assert.equal(licenses[0].id, 4242)
  })

  it('returns the latest license to the employer', async () => {
    const response = await request('/api/licenses/latest')
    assert.equal(response.status, 200)
    const license = await response.json() as { id: number; status: string }
    assert.equal(license.id, 4242)
    assert.equal(license.status, 'review')
  })

  it('approves a license with the owner key', async () => {
    const response = await request('/api/licenses/4242', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ status: 'approved' }),
    })
    assert.equal(response.status, 200)
    const license = await response.json() as { id: number; status: string }
    assert.equal(license.status, 'approved')
  })

  it('lets the employer see the owner decision', async () => {
    const response = await request('/api/licenses/latest')
    const license = await response.json() as { status: string }
    assert.equal(license.status, 'approved')
  })

  it('rejects a license update without the owner key', async () => {
    const response = await request('/api/licenses/4242', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    })
    assert.equal(response.status, 401)
  })
})
