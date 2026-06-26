import Groq from 'groq-sdk'
import axios from 'axios'
import pool from '../db/index.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Tool Definitions (Groq function calling schema) ─────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List all indexed files in the repository to understand the project structure',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_codebase',
      description: 'Semantically search the indexed codebase for code chunks relevant to a specific concern. Use this to find code related to auth, DB queries, error handling, API calls, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of the code pattern you are looking for'
          },
          limit: {
            type: 'number',
            description: 'Max number of chunks to return (default 8, max 15)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read all stored chunks from a specific file to inspect its full contents. Use this to deeply investigate a suspicious file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Full or partial file path to read (e.g. "github.js" or "src/services/github.js")'
          }
        },
        required: ['path']
      }
    }
  }
]

// ─── Tool Implementations ────────────────────────────────────────────────────

async function embedQuery(query) {
  const response = await axios.post('http://localhost:11434/api/embeddings', {
    model: 'nomic-embed-text',
    prompt: query
  })
  return response.data.embedding
}

async function toolListFiles(repoUrl) {
  const result = await pool.query(
    `SELECT DISTINCT path FROM code_chunks WHERE repo_url = $1 ORDER BY path`,
    [repoUrl]
  )
  if (result.rows.length === 0) return 'No files indexed for this repo.'
  return `Indexed files (${result.rows.length} total):\n` + result.rows.map(r => `  - ${r.path}`).join('\n')
}

async function toolSearchCodebase(repoUrl, query, limit = 8) {
  const clampedLimit = Math.min(limit, 15)
  const embedding = await embedQuery(query)
  const result = await pool.query(
    `SELECT path, start_line, end_line, content
     FROM code_chunks
     WHERE repo_url = $1
     ORDER BY embedding <-> $2
     LIMIT $3`,
    [repoUrl, `[${embedding.join(',')}]`, clampedLimit]
  )
  if (result.rows.length === 0) return 'No relevant chunks found.'
  return result.rows.map(r =>
    `File: ${r.path} (lines ${r.start_line}-${r.end_line})\n\`\`\`\n${r.content}\n\`\`\``
  ).join('\n\n---\n\n')
}

async function toolReadFile(repoUrl, path) {
  const result = await pool.query(
    `SELECT path, start_line, end_line, content
     FROM code_chunks
     WHERE repo_url = $1 AND path ILIKE $2
     ORDER BY start_line`,
    [repoUrl, `%${path}%`]
  )
  if (result.rows.length === 0) return `No file found matching "${path}". Try a shorter path fragment.`
  const filePath = result.rows[0].path
  return `File: ${filePath} (${result.rows.length} chunks)\n\n` +
    result.rows.map(r =>
      `Lines ${r.start_line}-${r.end_line}:\n\`\`\`\n${r.content}\n\`\`\``
    ).join('\n\n')
}

async function executeTool(repoUrl, toolName, rawArgs) {
  const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs) : rawArgs
  switch (toolName) {
    case 'list_files':
      return await toolListFiles(repoUrl)
    case 'search_codebase':
      return await toolSearchCodebase(repoUrl, args.query, args.limit)
    case 'read_file':
      return await toolReadFile(repoUrl, args.path)
    default:
      return `Unknown tool: ${toolName}`
  }
}

// ─── Agentic Audit Loop ──────────────────────────────────────────────────────

export async function agentAudit(repoUrl, tier1Issues = []) {
  const MAX_ITERATIONS = 10

  const tier1Context = tier1Issues.length > 0
    ? `Tier 1 (multi-pass RAG) already found these issues — use them as leads to investigate deeper:\n\n${JSON.stringify(tier1Issues, null, 2)}`
    : 'No prior findings — start a fresh investigation from scratch.'

  const messages = [
    {
      role: 'system',
      content: `You are an expert code security researcher and software engineer. You have access to tools to search and read code from an indexed repository.

Your goal: find real issues that a simple keyword search would miss — logic bugs, security flaws, hidden vulnerabilities, and architecture problems.

Investigation strategy:
1. Call list_files first to understand the project structure
2. Search for specific patterns (auth flows, DB queries, error handling, external calls, config loading)  
3. When something looks suspicious, read the full file to confirm
4. Follow the call chain — if you see a function called somewhere suspicious, search for where it's defined
5. Look for issues the Tier 1 scan missed or only partially caught

When you are done investigating (or have reached a thorough conclusion), return ONLY a JSON array with no other text:
[{
  "severity": "high|medium|low",
  "type": "security|bug|quality|performance",
  "file": "exact/path/to/file.js",
  "lines": "start-end",
  "title": "Concise issue title",
  "description": "What the issue is, why it matters, and what the fix would be",
  "confidence": "high|medium|low"
}]

If you find no new issues, return exactly: []`
    },
    {
      role: 'user',
      content: `Repository: ${repoUrl}\n\n${tier1Context}\n\nBegin your investigation.`
    }
  ]

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 4096
    })

    const choice = response.choices[0]
    messages.push(choice.message)

    // LLM finished investigating — parse final report
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      const content = (choice.message.content || '').trim()
      const cleaned = content.replace(/```json|```/g, '').trim()
      try {
        const parsed = JSON.parse(cleaned)
        console.log(`[Agent] Finished after ${iteration + 1} iterations. Found ${parsed.length} issues.`)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        console.error('[Agent] Final response was not valid JSON:', cleaned.slice(0, 200))
        return []
      }
    }

    // Execute each tool the LLM requested
    for (const toolCall of choice.message.tool_calls) {
      const { name, arguments: rawArgs } = toolCall.function
      console.log(`[Agent] iter=${iteration + 1} tool=${name}`, rawArgs)

      let result
      try {
        result = await executeTool(repoUrl, name, rawArgs)
      } catch (err) {
        result = `Tool error: ${err.message}`
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result
      })
    }
  }

  console.warn('[Agent] Reached max iterations without a final answer.')
  return []
}
