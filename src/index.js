import express from 'express'
import dotenv from 'dotenv'
import { Queue } from 'bullmq'
import pool from './db/index.js'
import './workers/auditWorker.js'
import { repoAlreadyIndexed, getExistingReport } from './db/queries.js'

dotenv.config()

const app = express()
app.use(express.json())

const auditQueue = new Queue('audit', {
  connection: { host: 'localhost', port: 6379 }
})

app.post('/api/audit', async (req, res) => {
  const { repoUrl } = req.body

  if (!repoUrl) {
    return res.status(400).json({ error: 'Repo URL is required' })
  }
  const alreadyIndexed = await repoAlreadyIndexed(repoUrl)
  if (alreadyIndexed) {
    const existingReport = await getExistingReport(repoUrl)

    if (existingReport) {
      const chunkData = await pool.query(
        'SELECT COUNT(*) as chunks, COUNT(DISTINCT path) as files FROM code_chunks WHERE repo_url = $1', [repoUrl]
      )
      const chunks = parseInt(chunkData.rows[0].chunks)
      const files = parseInt(chunkData.rows[0].files)

      return res.json({ 
        status: 'cached', 
        report: existingReport,
        totalFiles: files,
        codeFiles: files,
        totalChunks: chunks
      })
    }
  }

  try {
    const job = await auditQueue.add('audit-repo', { repoUrl })
    res.json({ jobId: job.id, status: 'queued', message: 'Audit started' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue audit', details: err.message })
  }
})

app.get('/api/status/:jobId', async (req, res) => {
  const { jobId } = req.params

  try {
    const job = await auditQueue.getJob(jobId)

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    const state = await job.getState()
    const progress = job.progress

    if (state === 'completed') {
      return res.json({ jobId, status: 'completed', progress: 100, result: job.returnvalue })
    }

    if (state === 'failed') {
      return res.json({ jobId, status: 'failed', error: job.failedReason })
    }

    res.json({ jobId, status: state, progress })
  } catch (err) {
    res.status(500).json({ error: 'Failed to get job status', details: err.message })
  }
})

app.get('/api/report/:repoUrl', async (req, res) => {
  const repoUrl = decodeURIComponent(req.params.repoUrl)

  try {
    const result = await pool.query(
      'SELECT report, created_at FROM audit_reports WHERE repo_url = $1',
      [repoUrl]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No report found for this repo' })
    }

    res.json({ repoUrl, ...result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report', details: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`CodeLens running on port ${PORT}`))