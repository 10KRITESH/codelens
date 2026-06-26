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