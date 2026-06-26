import Groq from 'groq-sdk'
import axios from 'axios'
import pool from '../db/index.js'
import { agentAudit } from './agentAuditor.js'

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

async function runAuditPass(repoUrl, passConfig) {
  const queryEmbedding = await embedQuery(passConfig.query)
  const chunks = await searchSimilarChunks(repoUrl, queryEmbedding)

  const context = chunks.map(chunk =>
    `File: ${chunk.path} (lines ${chunk.start_line}-${chunk.end_line})\n${chunk.content}`
  ).join('\n\n---\n\n')

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a senior code auditor specializing in ${passConfig.focus}.
Return ONLY a JSON array of issues, no markdown, no explanation.
Format: [{ "severity": "high|medium|low", "type": "${passConfig.type}", "file": "path", "lines": "23-45", "title": "short title", "description": "what and why" }]
If no issues found, return an empty array: []`
      },
      {
        role: 'user',
        content: `Find ${passConfig.focus} issues in this code:\n\n${context}`
      }
    ]
  })

  const raw = response.choices[0].message.content
  const cleaned = raw.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    console.error(`Pass "${passConfig.focus}" returned invalid JSON:`, cleaned)
    return []
  }
}

// ─── Tier 1: Multi-pass RAG ──────────────────────────────────────────────────

export async function auditRepo(repoUrl) {
  const passes = [
    { query: 'security vulnerabilities exposed secrets hardcoded credentials api keys', focus: 'security vulnerabilities', type: 'security' },
    { query: 'bugs null pointer undefined errors wrong logic crashes unhandled promise', focus: 'bugs and logic errors', type: 'bug' },
    { query: 'poor code quality duplicate code long functions missing abstractions', focus: 'code quality', type: 'quality' },
    { query: 'performance bottlenecks slow loops expensive operations memory leaks', focus: 'performance issues', type: 'performance' },
  ]

  const allIssues = []

  for (const pass of passes) {
    const issues = await runAuditPass(repoUrl, pass)
    allIssues.push(...issues.map(i => ({ ...i, source: 'tier1' })))
  }

  return allIssues
}

// ─── Deduplication & Merge ───────────────────────────────────────────────────

function parseLineRange(lines = '') {
  const [start, end] = String(lines).split('-').map(Number)
  return { start: start || 0, end: end || start || 0 }
}

function overlaps(a, b) {
  if (a.file !== b.file) return false
  const ra = parseLineRange(a.lines)
  const rb = parseLineRange(b.lines)
  return ra.start <= rb.end && rb.start <= ra.end
}

const SEVERITY_RANK = { high: 3, medium: 2, low: 1 }

function deduplicateIssues(tier1, tier2) {
  const merged = [...tier1]

  for (const t2Issue of tier2) {
    const duplicate = merged.find(existing => overlaps(existing, t2Issue))
    if (duplicate) {
      // Keep the higher severity version, add agent confidence flag
      if ((SEVERITY_RANK[t2Issue.severity] || 0) > (SEVERITY_RANK[duplicate.severity] || 0)) {
        duplicate.severity = t2Issue.severity
        duplicate.description = t2Issue.description
      }
      duplicate.agentVerified = true
    } else {
      merged.push({ ...t2Issue, source: 'tier2' })
    }
  }

  return merged
}

function buildReport(issues, tier1Count, tier2Count) {
  const fileRiskMap = {}
  for (const issue of issues) {
    if (!fileRiskMap[issue.file]) fileRiskMap[issue.file] = 0
    fileRiskMap[issue.file] += SEVERITY_RANK[issue.severity] || 1
  }

  const riskiestFiles = Object.entries(fileRiskMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file]) => file)

  const highCount = issues.filter(i => i.severity === 'high').length
  const mediumCount = issues.filter(i => i.severity === 'medium').length
  const score = Math.max(0, 100 - (highCount * 10) - (mediumCount * 4) - (issues.length * 1))

  return {
    summary: `Full audit complete. Found ${issues.length} issues (${highCount} high, ${mediumCount} medium). Tier 1 RAG: ${tier1Count} issues, Tier 2 Agent: ${tier2Count} new issues.`,
    issues,
    riskiestFiles,
    score,
    meta: { tier1Count, tier2Count, totalUnique: issues.length }
  }
}

// ─── Full Combined Audit (Tier 1 + Tier 2) ───────────────────────────────────

export async function fullAudit(repoUrl) {
  console.log('[Audit] Starting Tier 1 multi-pass RAG...')
  const tier1Issues = await auditRepo(repoUrl)
  console.log(`[Audit] Tier 1 complete: ${tier1Issues.length} issues found.`)

  console.log('[Audit] Starting Tier 2 agentic investigation...')
  const tier2Issues = await agentAudit(repoUrl, tier1Issues)
  console.log(`[Audit] Tier 2 complete: ${tier2Issues.length} new issues found.`)

  const merged = deduplicateIssues(tier1Issues, tier2Issues)
  const report = buildReport(merged, tier1Issues.length, tier2Issues.length)

  console.log(`[Audit] Final report: ${merged.length} unique issues, score=${report.score}`)
  return report
}