# AI Module

This module isolates server-side AI and ingest logic: URL → markdown, summarization, embeddings, tags/topics, and pgvector-backed similarity. The app triggers work from **Expo API routes** (`src/app/api/`), not from client bundles.

**Full reference:** [`docs/MEMORY_FEATURES.md`](../../../docs/MEMORY_FEATURES.md) (API tables, env vars, pipeline sequence, security notes).

## Structure

- **`tools/`** — One file per capability (extract, summarize, embed, tags, topics, assign-space, find-related-entries, Medium/Firecrawl scrape).
- **`pipelines/`** — Orchestration (`ingest.ts` = `processEntry`).

## Technologies

- **Vercel AI SDK** (`ai`, `@ai-sdk/openai`) — `generateText`, `embed`, `embedMany`, etc.
- **Jina Reader** — Generic URL → markdown (`r.jina.ai/...`, `JINA_API_KEY`).
- **Firecrawl** — Medium-class URLs (paywall-friendly when using a Firecrawl profile or cookies); see `tools/extract-content-medium-firecrawl.ts` and `.env.example`.
- **OpenAI** — Chat model for summarization/tags/topics; `text-embedding-3-small` for vectors (chunked + pooled when input exceeds token limits).
