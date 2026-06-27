import { GoogleGenAI, Type } from '@google/genai'
import axios from 'axios'
import pool from '../db/index.js'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

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

async function runAuditPass(repoUrl, passConfig) {
  const queryEmbedding = await embedQuery(passConfig.query)
  const chunks = await searchSimilarChunks(repoUrl, queryEmbedding)

  const context = chunks.map(chunk =>
    `File: ${chunk.path} (lines ${chunk.start_line}-${chunk.end_line})\n${chunk.content}`
  ).join('\n\n---\n\n')

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find ${passConfig.focus} issues in this code:\n\n${context}`,
      config: {
        systemInstruction: `You are a senior code auditor specializing in ${passConfig.focus}. Check the provided context files and output all issues.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
              type: { type: Type.STRING },
              file: { type: Type.STRING },
              lines: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['severity', 'type', 'file', 'lines', 'title', 'description']
          }
        }
      }
    })

    return JSON.parse(response.text)
  } catch (err) {
    console.error(`Pass "${passConfig.focus}" failed:`, err.message)
    return []
  }
}

// ─── Multi-pass RAG Audit ─────────────────────────────────────────────────────

export async function auditRepo(repoUrl) {
  const passes = [
    { query: 'security vulnerabilities exposed secrets hardcoded credentials api keys', focus: 'security vulnerabilities', type: 'security' },
    { query: 'bugs null pointer undefined errors wrong logic crashes unhandled promise', focus: 'bugs and logic errors', type: 'bug' },
    { query: 'poor code quality duplicate code long functions missing abstractions', focus: 'code quality', type: 'quality' },
    { query: 'performance bottlenecks slow loops expensive operations memory leaks', focus: 'performance issues', type: 'performance' },
  ]

  console.log('[Audit] Starting multi-pass RAG audit...')
  const allIssues = []

  for (const pass of passes) {
    console.log(`[Audit] Running pass: ${pass.focus}`)
    const issues = await runAuditPass(repoUrl, pass)
    console.log(`[Audit] Pass "${pass.focus}": ${issues.length} issues found`)
    allIssues.push(...issues)
  }

  const highCount = allIssues.filter(i => i.severity === 'high').length
  const mediumCount = allIssues.filter(i => i.severity === 'medium').length
  const score = Math.max(0, 100 - (highCount * 10) - (mediumCount * 4) - (allIssues.length * 1))

  const fileRiskMap = {}
  for (const issue of allIssues) {
    if (!fileRiskMap[issue.file]) fileRiskMap[issue.file] = 0
    const rank = { high: 3, medium: 2, low: 1 }
    fileRiskMap[issue.file] += rank[issue.severity] || 1
  }
  const riskiestFiles = Object.entries(fileRiskMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file]) => file)

  console.log(`[Audit] Complete: ${allIssues.length} issues found, score=${score}`)

  return {
    summary: `Audit complete. Found ${allIssues.length} issues (${highCount} high, ${mediumCount} medium).`,
    issues: allIssues,
    riskiestFiles,
    score
  }
}