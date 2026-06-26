import axios from 'axios'

const CODE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java',
  '.c', '.cpp', '.h', '.cs', '.rb', '.php', '.rs', '.swift'
]

export function filterCodeFiles(tree) {
    return tree.filter(file => {
        // only actual files, not folders
        if (file.type !== 'blob') return false

        // only code extensions
        const hasCodeExt = CODE_EXTENSIONS.some(ext => file.path.endsWith(ext))
        if (!hasCodeExt) return false

        // skip files over 100KB - too large to chunk menaingfully
        if (file.size > 100_000) return false

        return true
    })
}

export function parseRepoUrl(repoUrl) {
    const url = new URL(repoUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    return {
        owner: parts[0],
        repo: parts[1]
    }
}

const getHeaders = () => {
    const headers = {
        'User-Agent': 'CodeLens-App'
    }
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
    }
    return headers
}

export async function fetchRepoTree(owner, repo) {
  const repoInfo = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers: getHeaders() }
  )
  const defaultBranch = repoInfo.data.default_branch

  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers: getHeaders() }
  )
  return response.data.tree
}

export async function fetchFileContent (file) {
    const response = await axios.get(file.url, { headers: getHeaders() })
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
    return {
        path: file.path,
        content
    }
}