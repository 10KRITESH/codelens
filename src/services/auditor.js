import Groq from 'groq-sdk'
import axios from 'axios'
import pool from '../db/index.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function embedQuery(query) {
  const response = await axios.post('http://localhost:11434/api/embeddings', {
    model: 'nomic-embed-text',
    prompt: query
  })
  return response.data.embedding
}

async function searchSimilarChunks(repoUrl, queryEmbedding, limit = 10) {
  const result = await pool.query(
    `SELECT path, start_line, end_line, content
     FROM code_chunks
     WHERE repo_url = $1
     ORDER BY embedding <-> $2
     LIMIT $3`,
    [repoUrl, `[${queryEmbedding.join(',')}]`, limit]
  )
  return result.rows
}

export async function auditRepo(repoUrl) {
  const query = 'security vulnerabilities, bugs, risky code, poor error handling, exposed secrets'

  const queryEmbedding = await embedQuery(query)
  const relevantChunks = await searchSimilarChunks(repoUrl, queryEmbedding)

  const context = relevantChunks.map(chunk =>
    `File: ${chunk.path} (lines ${chunk.start_line}-${chunk.end_line})\n${chunk.content}`
  ).join('\n\n---\n\n')

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a senior code auditor. Analyze the provided code chunks and return a JSON audit report.
Your response must be valid JSON only, no markdown, no explanation outside the JSON.
Format:
{
  "summary": "brief overall assessment",
  "issues": [
    {
      "severity": "high|medium|low",
      "type": "bug|security|quality",
      "file": "path/to/file.js",
      "lines": "23-45",
      "title": "short issue title",
      "description": "what the issue is and why it matters"
    }
  ],
  "riskiestFiles": ["file1.js", "file2.js"],
  "score": 0
}`
      },
      {
        role: 'user',
        content: `Audit this codebase:\n\n${context}`
      }
    ]
  })

  const raw = response.choices[0].message.content
const cleaned = raw.replace(/```json|```/g, '').trim()
return JSON.parse(cleaned)
}