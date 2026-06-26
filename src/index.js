import express from 'express'
import dotenv from 'dotenv'
import { parseRepoUrl, fetchRepoTree, filterCodeFiles } from './services/github.js'

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

    res.json({ owner, repo, totalFiles: tree.length, codeFiles: codeFiles.length, files: codeFiles })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`CodeLens running on port ${PORT}`))