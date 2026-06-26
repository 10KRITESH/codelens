export function chunkFile(path, content, chunkSize = 40, overlap = 5) {
    const lines = content.split('\n')
    const chunks = []
    let i = 0

    while (i < lines.length) {
        const chunkLines = lines.slice(i, i + chunkSize)
        const chunkContent = chunkLines.join('\n')

        chunks.push({
            path,
            startLine: i + 1,
            endLine: i + chunkLines.length,
            content: chunkContent
        })
        i += chunkSize - overlap
    }
    return chunks
}