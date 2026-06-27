import { Worker } from 'bullmq'
import { parseRepoUrl, fetchRepoTree, filterCodeFiles, fetchFileContent } from '../services/github.js'
import { chunkFile } from '../services/chunker.js'
import { embedChunk } from '../services/embedder.js'
import { insertChunk, deleteChunksByRepo } from '../db/queries.js'
import { auditRepo } from '../services/auditor.js'
import pool from '../db/index.js'

export const worker = new Worker('audit', async (job) => {
  const { repoUrl } = job.data

  await job.updateProgress(5)

  const { owner, repo } = parseRepoUrl(repoUrl)
  const tree = await fetchRepoTree(owner, repo)
  const codeFiles = filterCodeFiles(tree)

  await deleteChunksByRepo(repoUrl)
  await job.updateProgress(10)

  let totalChunks = 0
  let failedFiles = []

  for (const file of codeFiles) {
    try {
      const { path, content } = await fetchFileContent(file)
      const chunks = chunkFile(path, content)

      for (const chunk of chunks) {
        try {
          const embeddedResult = await embedChunk(chunk)
          await insertChunk(repoUrl, embeddedResult)
          totalChunks++
        } catch (err) {
          console.error(`Failed to embed/store chunk in ${path}:`, err.message)
        }
      }
    } catch (err) {
      console.error(`Failed to process file ${file.path}:`, err.message)
      failedFiles.push(file.path)
    }

    const progress = 10 + Math.floor((codeFiles.indexOf(file) / codeFiles.length) * 70)
    await job.updateProgress(progress)
  }

  await job.updateProgress(80)
  console.log('[Worker] Running audit...')
  const report = await auditRepo(repoUrl)
  await job.updateProgress(95)

  await pool.query(
    `INSERT INTO audit_reports (repo_url, report) VALUES ($1, $2)
     ON CONFLICT (repo_url) DO UPDATE SET report = $2, created_at = NOW()`,
    [repoUrl, JSON.stringify(report)]
  )

  await job.updateProgress(100)

  return { owner, repo, totalFiles: tree.length, codeFiles: codeFiles.length, totalChunks, failedFiles, report }

}, {
  connection: { host: 'localhost', port: 6379 }
})