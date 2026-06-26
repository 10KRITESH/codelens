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

export async function fetchRepoTree(owner, repo) {
    const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
    )
    return response.data.tree
}
