import express from 'express'
import dotenv from 'dotenv'
import { parseRepoUrl, fetchRepoTree, filterCodeFiles, fetchFileContent } from './services/github.js'
import { chunkFile } from './services/chunker.js'
import { embeddedChunk } from './services/embedder.js'
import { insertChunk } from './db/queries.js'

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

  let totalChunks = 0

  for (const file of codeFiles) {
    const { path, content } = await fetchFileContent(file)
    const chunks = chunkFile(path, content)

    for (const chunk of chunks) {
      const embeddedResult = await embeddedChunk(chunk)
      await insertChunk(repoUrl, embeddedResult)
      totalChunks++
    }
  }

  res.json({ owner, repo, totalFiles: tree.length, codeFiles: codeFiles.length, totalChunks, message: 'indexing complete' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`CodeLens running on port ${PORT}`))