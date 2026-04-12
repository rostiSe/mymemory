# AI Module

This module isolates server-side AI and ingest logic: URL → markdown, summarization, embeddings, tags/topics, and pgvector-backed similarity. The app triggers work from **Expo API routes** (`src/app/api/`), not from client bundles.

**Full reference:** [`docs/MEMORY_FEATURES.md`](../../../docs/MEMORY_FEATURES.md) (API tables, env vars, pipeline sequence, security notes).

## Structure

- **`tools/`** — One file per capability (extract, summarize, embed, tags, topics, find-related-entries, Medium/Firecrawl scrape). Space auto-assign removed; suggestions live in `modules/spaces/` + ingest.
- **`pipelines/`** — Orchestration (`ingest.ts` = `processEntry`).

## Smoke test (`analyzeContent`)

From `apps/server`, with `OPENAI_API_KEY` set:

`pnpm smoke:analyze-content`

Optional markdown after `--`: `pnpm smoke:analyze-content -- "# Title\n\nBody."`

Do not use `tsx -e` with top-level `await` — `tsx` evaluates `-e` as CJS. Use this script or an async IIFE.

## Smoke test (full `processEntry` / ingest)

From `apps/server` with `DATABASE_URL`, `OPENAI_API_KEY`, and `JINA_API_KEY` (and optional `FIRECRAWL_API_KEY` for Medium):

Create a URL entry and run the pipeline:

`pnpm smoke:ingest --create "<your-auth-user-uuid>" "https://example.com/blog/post"`

Or process an existing row:

`pnpm smoke:ingest "<entry-uuid>" "<user-uuid>"`

Prints a JSON preview (`processedStatus`, summary snippet, `wordCount`, `language`, cover URL, etc.). Exit code 1 if status is not `done`. The script calls `closeDb()` when finished so the process exits (the shared Postgres pool would otherwise keep Node alive).

## Technologies

- **Vercel AI SDK** (`ai`, `@ai-sdk/openai`) — `generateText`, `embed`, `embedMany`, etc.
- **Jina Reader** — Generic URL → markdown (`r.jina.ai/...`, `JINA_API_KEY`).
- **Firecrawl** — Medium-class URLs (paywall-friendly when using a Firecrawl profile or cookies); see `tools/extract-content-medium-firecrawl.ts` and `.env.example`.
- **OpenAI** — Chat model for summarization/tags/topics; `text-embedding-3-small` for vectors (chunked + pooled when input exceeds token limits).
