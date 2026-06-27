<div align="center">

# 🔍 CodeLens

**AI-Powered GitHub Repository Auditor**

Submit a GitHub repo URL → CodeLens fetches, chunks, and embeds the entire codebase → then runs a multi-pass RAG audit using an LLM to surface security vulnerabilities, bugs, code quality issues, and performance bottlenecks.

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-v5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-v19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

</div>

---

## 📸 How It Works

```
  You submit a GitHub repo URL
         │
         ▼
  ┌──────────────────────┐
  │   Express API        │  POST /api/audit
  │   (src/index.js)     │──────────────────┐
  └──────────────────────┘                  │
                                            ▼
                                   ┌─────────────────┐
                                   │  BullMQ Queue    │
                                   │  (Redis-backed)  │
                                   └────────┬────────┘
                                            │
                                            ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    Audit Worker                         │
  │                                                         │
  │  1. Fetch all files from GitHub API                     │
  │  2. Filter to code files (.js, .py, .go, etc.)          │
  │  3. Split each file into overlapping chunks (40 lines)  │
  │  4. Generate 768-dim embeddings via Ollama              │
  │  5. Store chunks + vectors in PostgreSQL (pgvector)     │
  │  6. Run multi-pass RAG audit via Groq LLM              │
  └─────────────────────────────────────────────────────────┘
                          │
                          ▼
  ┌─────────────────────────────────────────────────────────┐
  │                  Multi-Pass RAG Audit                   │
  │                                                         │
  │  Pass 1: Security vulnerabilities & exposed secrets     │
  │  Pass 2: Bugs, null pointers & unhandled errors         │
  │  Pass 3: Code quality, duplication & magic numbers      │
  │  Pass 4: Performance bottlenecks & memory leaks         │
  │                                                         │
  │  Each pass: embed query → cosine similarity search      │
  │  → retrieve top-N chunks → LLM analysis → JSON issues   │
  └─────────────────────────────────────────────────────────┘
                          │
                          ▼
           ┌──────────────────────────┐
           │   Structured Report      │
           │                          │
           │  • Health score (0-100)  │
           │  • Issues by severity    │
           │  • Riskiest files        │
           │  • Actionable fixes      │
           └──────────────────────────┘
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Full-Repo Indexing** | Fetches and processes every code file from any public GitHub repo via the GitHub API |
| **Sliding Window Chunker** | Splits files into 40-line chunks with 5-line overlap to preserve cross-boundary context |
| **Vector Embeddings** | Generates 768-dimensional vectors using Ollama's `nomic-embed-text` model locally |
| **pgvector Storage** | Stores code chunks and embeddings in PostgreSQL with cosine similarity search |
| **Multi-Pass RAG Audit** | 4 specialized audit passes (security, bugs, quality, performance) each with their own RAG query |
| **Async Job Queue** | BullMQ + Redis for non-blocking audit processing with real-time progress tracking |
| **Smart Caching** | Returns cached reports for previously audited repos; supports forced re-audit |
| **React Dashboard** | Clean UI with health score, severity filters, riskiest files, and detailed issue cards |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js (ES Modules) | Server runtime |
| **API** | Express v5 | REST API with async error handling |
| **Frontend** | React 19 + Vite | Audit dashboard |
| **Styling** | Tailwind CSS | UI styling |
| **Database** | PostgreSQL + pgvector | Code chunk storage & vector similarity search |
| **Job Queue** | BullMQ + Redis | Async audit job processing |
| **Embeddings** | Ollama (`nomic-embed-text`) | Local 768-dim vector generation |
| **LLM** | Groq (`llama-3.3-70b-versatile`) | Code analysis & issue detection |
| **HTTP Client** | Axios | GitHub API & Ollama API calls |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v22+
- **PostgreSQL** with the [pgvector](https://github.com/pgvector/pgvector) extension enabled
- **Redis** (for BullMQ job queue)
- **Ollama** running locally with the `nomic-embed-text` model

### 1. Clone & Install

```bash
git clone https://github.com/10KRITESH/codelens.git
cd codelens

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Set Up Services

```bash
# PostgreSQL — make sure pgvector extension is enabled
psql -U postgres -c "CREATE DATABASE codelens;"
psql -U postgres -d codelens -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql -U postgres -d codelens -f src/db/schema.sql

# Redis — start if not already running
redis-server --daemonize yes

# Ollama — pull the embedding model
ollama pull nomic-embed-text
```

### 3. Configure Environment

Create a `.env` file in the project root:

```env
PORT=3000
DATABASE_URL=postgresql://postgres@localhost:5432/codelens
GROQ_API_KEY=gsk_your_groq_api_key_here
GITHUB_TOKEN=github_pat_your_token_here
```

> **Note:** A `GITHUB_TOKEN` is recommended to avoid the 60 req/hr unauthenticated rate limit. Generate one at [github.com/settings/tokens](https://github.com/settings/tokens).

### 4. Run

```bash
# Terminal 1 — Backend (auto-restarts on file changes)
npm run dev

# Terminal 2 — Frontend (Vite dev server with API proxy)
cd frontend && npm run dev
```

- **Backend API:** [http://localhost:3000](http://localhost:3000)
- **Frontend UI:** [http://localhost:5173](http://localhost:5173)

---

## 📡 API Reference

### `POST /api/audit`

Start a new audit or get a cached report.

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/owner/repo"}'
```

| Body Param | Type | Required | Description |
|-----------|------|----------|-------------|
| `repoUrl` | string | ✅ | Full GitHub repository URL |
| `force` | boolean | ❌ | Set `true` to bypass cache and re-audit |

**Response (queued):**
```json
{ "jobId": "1", "status": "queued", "message": "Audit started" }
```

**Response (cached):**
```json
{ "status": "cached", "report": { ... }, "totalFiles": 42, "totalChunks": 310 }
```

---

### `GET /api/status/:jobId`

Poll the progress of a running audit job.

```bash
curl http://localhost:3000/api/status/1
```

**Response:**
```json
{ "jobId": "1", "status": "active", "progress": 65 }
```

When complete:
```json
{
  "jobId": "1",
  "status": "completed",
  "progress": 100,
  "result": {
    "owner": "owner",
    "repo": "repo",
    "totalFiles": 150,
    "codeFiles": 42,
    "totalChunks": 310,
    "report": {
      "summary": "Audit complete. Found 18 issues (4 high, 8 medium).",
      "issues": [ ... ],
      "riskiestFiles": ["src/auth.js", "src/db/queries.js"],
      "score": 62
    }
  }
}
```

---

### `GET /api/report/:repoUrl`

Fetch a stored audit report by repo URL (URL-encoded).

```bash
curl http://localhost:3000/api/report/https%3A%2F%2Fgithub.com%2Fowner%2Frepo
```

---

## 📂 Project Structure

```
codelens/
├── src/
│   ├── index.js                  # Express server, API routes, BullMQ queue
│   ├── db/
│   │   ├── index.js              # PostgreSQL connection pool
│   │   ├── queries.js            # DB queries (insert chunks, check cache, etc.)
│   │   └── schema.sql            # Table definitions (code_chunks, audit_reports)
│   ├── services/
│   │   ├── github.js             # GitHub API (fetch tree, file content, filtering)
│   │   ├── chunker.js            # Sliding window code chunker
│   │   ├── embedder.js           # Ollama embedding generation
│   │   └── auditor.js            # Multi-pass RAG audit via Groq LLM
│   └── workers/
│       └── auditWorker.js        # BullMQ worker (fetch → chunk → embed → audit)
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app with state management & API calls
│   │   └── components/
│   │       ├── AuditForm.jsx     # Repo URL input form
│   │       ├── ProgressBar.jsx   # Real-time audit progress
│   │       ├── ReportView.jsx    # Full report layout
│   │       ├── ScoreCard.jsx     # Health score display
│   │       ├── StatsRow.jsx      # File/chunk/issue counts
│   │       ├── IssueList.jsx     # Filtered issue list
│   │       ├── IssueCard.jsx     # Individual issue display
│   │       ├── IssueFilters.jsx  # Severity filter tabs
│   │       ├── RiskiestFiles.jsx # Top risk file list
│   │       └── Header.jsx        # App header
│   └── vite.config.js            # Vite config with /api proxy to backend
├── .env                          # Environment variables
├── package.json                  # Backend dependencies & scripts
└── README.md
```

---

## 🧠 Supported Languages

CodeLens filters and analyzes files with these extensions:

`.js` `.ts` `.jsx` `.tsx` `.py` `.go` `.java` `.c` `.cpp` `.h` `.cs` `.rb` `.php` `.rs` `.swift`

Files over **100 KB** are automatically skipped.

---

## 🔄 Re-Auditing

After fixing issues in your repo, you can force a fresh audit instead of getting the cached report:

- **From the UI:** Click the **"Re-Audit"** button on the report page
- **From the API:** Send `"force": true` in the request body:

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/owner/repo", "force": true}'
```

This will re-fetch all code from GitHub, re-embed every chunk, and run a completely fresh multi-pass audit.

---

## 📄 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

<div align="center">

**Built by [Kritesh Goud](https://github.com/10KRITESH)**

</div>
