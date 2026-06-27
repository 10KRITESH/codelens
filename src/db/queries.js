import pool from './index.js'

export async function insertChunk(repoUrl, chunk) {
    const { path, startLine, endLine, content, embedding } = chunk

    await pool.query(
        `INSERT INTO code_chunks (repo_url, path, start_line, end_line, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [repoUrl, path, startLine, endLine, content, `[${embedding.join(',')}]`]
    )
}

export async function deleteChunksByRepo(repoUrl) {
    await pool.query(
        `DELETE FROM code_chunks WHERE repo_url = $1`,
        [repoUrl]
    )
}

export async function repoAlreadyIndexed(repoUrl) {
    const result = await pool.query(
        `SELECT COUNT(*) FROM code_chunks WHERE repo_url = $1`,
        [repoUrl]
    )
    return parseInt(result.rows[0].count) > 0
}

export async function getExistingReport(repoUrl) {
    const result = await pool.query(
        `SELECT report FROM audit_reports WHERE repo_url = $1`,
        [repoUrl]
    )
    if (result.rows.length === 0) return null
    return result.rows[0].report
}