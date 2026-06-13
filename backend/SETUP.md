# Cortex Backend — Complete Setup Guide

End-to-end setup for the FastAPI RAG backend using **Groq** (free LLM) and
**PostgreSQL + pgvector** (via Docker). Commands are for **Windows PowerShell**;
notes for macOS/Linux are inline.

> What's free here: embeddings run **locally** (sentence-transformers, no key),
> and the LLM uses **Groq's free tier**. The only key you need is a free Groq key
> — and even without it, the app auto-falls back to a `mock` LLM so it still runs.

---

## 0. Prerequisites

| Tool | Why | Check |
|---|---|---|
| Docker Desktop | runs Postgres + pgvector | `docker --version` |
| Python 3.12 | backend runtime | `py -3.12 --version` |
| (optional) Node 18+ | run the frontend too | `node --version` |

Both Docker and Python 3.12 are already installed on this machine.

---

## 1. Get a free Groq API key

1. Go to **https://console.groq.com** and sign in (Google/GitHub — no credit card).
2. Open **API Keys** → **Create API Key**, give it a name.
3. Copy the key (it starts with `gsk_...`). You'll paste it in Step 4.

Free tier gives you fast Llama-3.3-70B inference with generous rate limits —
plenty for development and a student project.

---

## 2. Start PostgreSQL + pgvector (Docker)

```powershell
docker run -d --name cortex-db `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=cortex `
  -p 5432:5432 `
  pgvector/pgvector:pg16
```

macOS/Linux: replace the backticks with `\`.

This matches the `DATABASE_URL` in `.env`. On first startup the app runs
`CREATE EXTENSION IF NOT EXISTS vector` and creates every table + the HNSW
vector index automatically — no manual SQL.

Useful later: `docker stop cortex-db` / `docker start cortex-db` /
`docker logs cortex-db`.

---

## 3. Create the Python environment & install dependencies

```powershell
cd D:\multi-tenant\backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

- macOS/Linux activation: `source .venv/bin/activate`
- If PowerShell blocks activation: `Set-ExecutionPolicy -Scope Process RemoteSigned`
  then re-run, or skip activation and prefix commands with `.\.venv\Scripts\python.exe`.

⏱️ **This step downloads PyTorch (~2.5 GB)** as a dependency of
sentence-transformers, so it takes several minutes the first time.

---

## 4. Configure `.env`

`.env` already exists with working defaults. Open it and paste your Groq key:

```ini
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_your_key_here          # ← paste from Step 1
GROQ_MODEL=llama-3.3-70b-versatile

DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/cortex
JWT_SECRET=change-me-to-something-random  # python -c "import secrets;print(secrets.token_urlsafe(48))"
```

> Leaving `GROQ_API_KEY` blank is fine for a first run — the app detects the
> missing key and uses the offline `mock` LLM instead of erroring. Add the key
> whenever you want real answers; no code change needed.

Other Groq models you can set as `GROQ_MODEL`: `llama-3.1-8b-instant` (fastest),
`gemma2-9b-it`, `llama-3.3-70b-versatile` (best quality, default).

---

## 5. Run the server

```powershell
uvicorn app.main:app --reload
```

Startup is quick — the embedding model loads lazily on the **first** upload/chat
(it downloads ~90 MB once, then is cached). You should see Uvicorn listening on
`http://localhost:8000`.

---

## 6. Verify it works

**Health & docs**
- http://localhost:8000/health → `{"status":"healthy",...}`
- http://localhost:8000/api/v1/docs → interactive Swagger UI

**Full round-trip from PowerShell** (register → org → upload → chat):

```powershell
$base = "http://localhost:8000/api/v1"

# 1) Register → get an access token
$reg = Invoke-RestMethod "$base/auth/register" -Method Post -ContentType application/json `
  -Body '{"name":"Ada","email":"ada@test.com","password":"Passw0rd!"}'
$token = $reg.accessToken

# 2) Create an organization → get its id
$org = Invoke-RestMethod "$base/organizations" -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType application/json -Body '{"name":"Acme"}'

# Common headers for every tenant-scoped call
$h = @{ Authorization = "Bearer $token"; "X-Organization-Id" = $org.id }

# 3) Upload a PDF (change the path to a real file)
$form = @{ file = Get-Item "C:\path\to\sample.pdf" }
$doc = Invoke-RestMethod "$base/documents" -Method Post -Headers $h -Form $form
$doc.id; $doc.status        # QUEUED → poll until READY

# 4) Poll status until processing finishes
do {
  Start-Sleep 3
  $d = Invoke-RestMethod "$base/documents/$($doc.id)" -Headers $h
  $d.status
} while ($d.status -notin @("READY","FAILED"))

# 5) Ask a question (Groq answers, grounded on your doc, with citations)
$ans = Invoke-RestMethod "$base/chat" -Method Post -Headers $h `
  -ContentType application/json -Body '{"content":"What is this document about?"}'
$ans.answer
$ans.citations
```

If `$d.status` reaches **READY** and `$ans.answer` comes back with citations,
the entire RAG pipeline (extract → chunk → embed → pgvector search → Groq) is
working.

---

## 7. (Optional) Run the frontend too

The Next.js app already points at this backend (`NEXT_PUBLIC_API_URL=
http://localhost:8000/api/v1`). In a second terminal:

```powershell
cd D:\multi-tenant
npm run dev        # http://localhost:3000
```

Register/login there and the dashboard, document upload, and streaming chat all
talk to this backend.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `connection refused` to DB on first run | Postgres needs ~2–3s after `docker run`; re-run uvicorn. |
| Port 5432 already in use | `-p 5433:5432` on the container, set `DATABASE_URL=...@localhost:5433/cortex`. |
| `Activate.ps1 cannot be loaded` | `Set-ExecutionPolicy -Scope Process RemoteSigned`, or use `.\.venv\Scripts\python.exe` directly. |
| Answers say "mock response" | `GROQ_API_KEY` is empty/invalid in `.env` — paste a valid key and restart. |
| Groq `401` / `invalid api key` | Key typo or revoked; create a new one at console.groq.com. |
| Groq `429 rate limit` | Free-tier limit hit; wait a moment or switch `GROQ_MODEL` to `llama-3.1-8b-instant`. |
| Upload stuck on `PROCESSING` | Check uvicorn logs; scanned/image-only PDFs yield no text → status `FAILED` with a message. |
| `pip` torch download too slow | It's a one-time ~2.5 GB download; let it finish (or use a faster network). |

---

## Quick reference (after first setup)

```powershell
docker start cortex-db                 # ensure DB is up
cd D:\multi-tenant\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```
