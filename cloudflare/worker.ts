import { initialApplicants, jobs as seedJobs } from '../src/data'

type Env = {
  DB: {
    prepare: (query: string) => any
    batch: (statements: any[]) => Promise<unknown>
  }
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  OWNER_API_TOKEN?: string
}

const defaultSettings = {
  platformNameAr: 'هازار للوظائف',
  platformNameEn: 'Hazar-Job.com',
  jobPrice: '5000',
  featuredPrice: '10000',
  currency: 'ريال يمني',
  paymentMethod: 'محفظة جيب (Jaib Wallet)',
  paymentAccountNumber: '47315',
  manualPayment: true,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  })
}

function authorized(request: Request, env: Env) {
  return Boolean(env.OWNER_API_TOKEN && request.headers.get('Authorization') === `Bearer ${env.OWNER_API_TOKEN}`)
}

async function ensureSeeded(env: Env) {
  const jobCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM jobs').first()
  if (Number(jobCount?.count || 0) === 0) {
    await env.DB.batch(seedJobs.map(job => env.DB.prepare('INSERT OR REPLACE INTO jobs (id, payload, updated_at) VALUES (?, ?, ?)').bind(job.id, JSON.stringify(job), new Date().toISOString())))
  }
  const applicantCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM applicants').first()
  if (Number(applicantCount?.count || 0) === 0) {
    await env.DB.batch(initialApplicants.map(applicant => env.DB.prepare('INSERT OR REPLACE INTO applicants (id, payload, updated_at) VALUES (?, ?, ?)').bind(applicant.id, JSON.stringify(applicant), new Date().toISOString())))
  }
  await env.DB.prepare('INSERT OR IGNORE INTO settings (id, payload, updated_at) VALUES (1, ?, ?)').bind(JSON.stringify(defaultSettings), new Date().toISOString()).run()
}

async function rowsAsJson(env: Env, table: 'jobs' | 'applicants') {
  const { results } = await env.DB.prepare(`SELECT payload FROM ${table} ORDER BY updated_at DESC`).all()
  return results.map((row: { payload: string }) => JSON.parse(row.payload))
}

async function handleApi(request: Request, env: Env, url: URL) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  await ensureSeeded(env)

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true, service: 'Hazar-Job.com Cloud API', time: new Date().toISOString() })
  }

  if (url.pathname === '/api/snapshot' && request.method === 'GET') {
    const [jobs, applicants, settingsRow] = await Promise.all([
      rowsAsJson(env, 'jobs'),
      rowsAsJson(env, 'applicants'),
      env.DB.prepare('SELECT payload FROM settings WHERE id = 1').first(),
    ])
    return json({
      jobs,
      applicants: applicants.sort((a: { match: number }, b: { match: number }) => b.match - a.match),
      settings: settingsRow ? JSON.parse(settingsRow.payload) : defaultSettings,
      updatedAt: new Date().toISOString(),
    })
  }

  if (url.pathname === '/api/jobs' && request.method === 'GET') return json(await rowsAsJson(env, 'jobs'))

  if (url.pathname === '/api/jobs' && request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>
    const job = { ...body, id: Number(body.id) || Date.now(), verified: false }
    await env.DB.prepare('INSERT OR REPLACE INTO jobs (id, payload, updated_at) VALUES (?, ?, ?)').bind(job.id, JSON.stringify(job), new Date().toISOString()).run()
    return json(job, 201)
  }

  const jobMatch = url.pathname.match(/^\/api\/jobs\/(\d+)$/)
  if (jobMatch && request.method === 'PATCH') {
    if (!authorized(request, env)) return json({ error: 'owner_authorization_required' }, 401)
    const id = Number(jobMatch[1])
    const current = await env.DB.prepare('SELECT payload FROM jobs WHERE id = ?').bind(id).first()
    if (!current) return json({ error: 'job_not_found' }, 404)
    const job = { ...JSON.parse(current.payload), ...await request.json(), id }
    await env.DB.prepare('UPDATE jobs SET payload = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(job), new Date().toISOString(), id).run()
    return json(job)
  }

  if (jobMatch && request.method === 'DELETE') {
    if (!authorized(request, env)) return json({ error: 'owner_authorization_required' }, 401)
    await env.DB.prepare('DELETE FROM jobs WHERE id = ?').bind(Number(jobMatch[1])).run()
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const applicantMatch = url.pathname.match(/^\/api\/applicants\/(\d+)\/status$/)
  if (applicantMatch && request.method === 'PATCH') {
    const id = Number(applicantMatch[1])
    const current = await env.DB.prepare('SELECT payload FROM applicants WHERE id = ?').bind(id).first()
    if (!current) return json({ error: 'applicant_not_found' }, 404)
    const applicant = { ...JSON.parse(current.payload), ...await request.json(), id }
    await env.DB.prepare('UPDATE applicants SET payload = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(applicant), new Date().toISOString(), id).run()
    return json(applicant)
  }

  if (url.pathname === '/api/settings' && request.method === 'GET') {
    const row = await env.DB.prepare('SELECT payload FROM settings WHERE id = 1').first()
    return json(row ? JSON.parse(row.payload) : defaultSettings)
  }

  if (url.pathname === '/api/settings' && request.method === 'PUT') {
    if (!authorized(request, env)) return json({ error: 'owner_authorization_required' }, 401)
    const current = await env.DB.prepare('SELECT payload FROM settings WHERE id = 1').first()
    const settings = { ...(current ? JSON.parse(current.payload) : defaultSettings), ...await request.json() }
    await env.DB.prepare('INSERT OR REPLACE INTO settings (id, payload, updated_at) VALUES (1, ?, ?)').bind(JSON.stringify(settings), new Date().toISOString()).run()
    return json(settings)
  }

  return json({ error: 'not_found' }, 404)
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url)
    return env.ASSETS.fetch(request)
  },
}
