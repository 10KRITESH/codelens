import axios from 'axios'

export async function embeddedChunk(chunk) {
    const response = await axios.post('http://localhost:11434/api/embeddings', {
        model: 'nomic-embed-text',
        prompt: `File: ${chunk.path}\nLines: ${chunk.startLine}-${chunk.endLine}\n\n${chunk.content}`
    })

    return {
        ...chunk,
        embedding: response.data.embedding
    }
}