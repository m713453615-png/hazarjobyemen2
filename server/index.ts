import express from 'express'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initialApplicants, jobs as seedJobs, type Applicant, type Job } from '../src/data'

type PublicSettings = {
  platformNameAr: string
  platformNameEn: string
  jobPrice: string
  featuredPrice: string
  currency: string
  paymentMethod: string
  paymentAccountNumber: string
  manualPayment: boolean
}

type StoredState = {
  jobs: Job[]
  applicants: Applicant[]
  settings: PublicSettings
  updatedAt: string
}

const app = express()
const port = Number(process.env.PORT || 8787)
const dataFile = process.env.HAZAR_DATA_FILE || join(dirname(fileURLToPath(import.meta.url)), 'hazar-data.json')

const initialState: StoredState = {
  jobs: structuredClone(seedJobs),
  applicants: structuredClone(initialApplicants),
  settings: {
    platformNameAr: 'هازار للوظائف',
    platformNameEn: 'Hazar-Job.com',
    jobPrice: '5000',
    featuredPrice: '10000',
    currency: 'ريال يمني',
    paymentMethod: 'محفظة جيب (Jaib Wallet)',
    paymentAccountNumber: '47315',
    manualPayment: true,
  },
  updatedAt: new Date().toISOString(),
}

function loadState(): StoredState {
  try {
    return existsSync(dataFile) ? { ...initialState, ...JSON.parse(readFileSync(dataFile, 'utf8')) as StoredState } : initialState
  } catch {
    return initialState
  }
}

let state = loadState()

function persist() {
  state.updatedAt = new Date().toISOString()
  writeFileSync(dataFile, JSON.stringify(state, null, 2), 'utf8')
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Hazar-Job.com API', updatedAt: state.updatedAt })
})

app.get('/api/snapshot', (_req, res) => {
  res.json({
    jobs: state.jobs,
    applicants: [...state.applicants].sort((a, b) => b.match - a.match),
    settings: state.settings,
    updatedAt: state.updatedAt,
  })
})

app.get('/api/jobs', (_req, res) => res.json(state.jobs))

app.post('/api/jobs', (req, res) => {
  const job = { ...req.body, id: Number(req.body.id) || Date.now(), verified: false } as Job
  state.jobs = [job, ...state.jobs.filter(item => item.id !== job.id)]
  persist()
  res.status(201).json(job)
})

app.patch('/api/jobs/:id', (req, res) => {
  const id = Number(req.params.id)
  state.jobs = state.jobs.map(job => job.id === id ? { ...job, ...req.body, id } : job)
  persist()
  res.json(state.jobs.find(job => job.id === id))
})

app.delete('/api/jobs/:id', (req, res) => {
  const id = Number(req.params.id)
  state.jobs = state.jobs.filter(job => job.id !== id)
  persist()
  res.status(204).end()
})

app.get('/api/applicants', (_req, res) => {
  res.json([...state.applicants].sort((a, b) => b.match - a.match))
})

app.patch('/api/applicants/:id/status', (req, res) => {
  const id = Number(req.params.id)
  state.applicants = state.applicants.map(candidate => candidate.id === id ? { ...candidate, status: req.body.status } : candidate)
  persist()
  res.json(state.applicants.find(candidate => candidate.id === id))
})

app.get('/api/settings', (_req, res) => res.json(state.settings))

app.put('/api/settings', (req, res) => {
  state.settings = { ...state.settings, ...req.body }
  persist()
  res.json(state.settings)
})

app.post('/api/cv/parse', (_req, res) => {
  res.json({
    name: 'أحمد العريقي',
    skills: ['React', 'TypeScript', 'إدارة المشاريع', 'التواصل'],
    experienceYears: 5,
    profileCompletion: 92,
  })
})

app.post('/api/payments/verify', (req, res) => {
  res.json({ id: Date.now(), reference: req.body.reference, status: 'pending_owner_review' })
})

app.listen(port, () => {
  console.log(`Hazar-Job.com API listening on http://localhost:${port}`)
})
