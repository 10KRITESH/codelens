import express from 'express'
import dotenv from 'dotenv'
import { parseRepoUrl, fetchRepoTree, filterCodeFiles, fetchFileContent } from './services/github.js'
import { chunkFile } from './services/chunker.js'
import { embeddedChunk } from './services/embedder.js'

dotenv.config()

const app = express()
app.use(express.json())

app.post('/api/audit', async (req, res) => {
  const { repoUrl } = req.body

  if (!repoUrl) {
    return res.status(400).json({ error: 'Repo URL is required' })
  }

  const { owner, repo } = parseRepoUrl(repoUrl)
  const tree = await fetchRepoTree(owner, repo)
  const codeFiles = filterCodeFiles(tree)
  const firstFile = await fetchFileContent(codeFiles[0])
  const chunks = chunkFile(firstFile.path, firstFile.content)
  const embeddedResult = await embeddedChunk(chunks[0])

  res.json({ owner, repo, totalFiles: tree.length, codeFiles: codeFiles.length, firstFile, embeddedChunk: embeddedResult })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`CodeLens running on port ${PORT}`))