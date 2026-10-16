import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { initialApplicants, jobs } from '../src/data.ts'

describe('seed data integrity', () => {
  it('ships unique job identifiers', () => {
    const ids = jobs.map(job => job.id)
    assert.equal(new Set(ids).size, ids.length, 'job identifiers must be unique')
  })

  it('ships unique applicant identifiers', () => {
    const ids = initialApplicants.map(applicant => applicant.id)
    assert.equal(new Set(ids).size, ids.length, 'applicant identifiers must be unique')
  })

  it('gives every job the fields the interface renders', () => {
    for (const job of jobs) {
      assert.ok(job.title, `job ${job.id} needs a title`)
      assert.ok(job.company, `job ${job.id} needs a company`)
      assert.ok(job.city, `job ${job.id} needs a city`)
      assert.ok(job.category, `job ${job.id} needs a category`)
      assert.ok(job.description, `job ${job.id} needs a description`)
      assert.ok(job.requirements.length > 0, `job ${job.id} needs requirements`)
      assert.ok(job.skills.length > 0, `job ${job.id} needs skills`)
      assert.ok(job.initials.length > 0, `job ${job.id} needs initials`)
      assert.match(job.logoColor, /^#[0-9a-f]{6}$/i, `job ${job.id} needs a hex color`)
    }
  })

  it('keeps the match score inside the 0-100 range', () => {
    for (const job of jobs) {
      assert.ok(job.match >= 0 && job.match <= 100, `job ${job.id} has an invalid match score`)
    }
    for (const applicant of initialApplicants) {
      assert.ok(applicant.match >= 0 && applicant.match <= 100, `applicant ${applicant.id} has an invalid match score`)
    }
  })

  it('links every applicant to an existing job', () => {
    const jobIds = new Set(jobs.map(job => job.id))
    for (const applicant of initialApplicants) {
      assert.ok(jobIds.has(applicant.jobId), `applicant ${applicant.id} points at a missing job`)
    }
  })

  it('uses a known application status for every applicant', () => {
    const statuses = new Set(['review', 'accepted', 'rejected'])
    for (const applicant of initialApplicants) {
      assert.ok(statuses.has(applicant.status), `applicant ${applicant.id} has an unknown status`)
    }
  })
})
