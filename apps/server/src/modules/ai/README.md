# AI Module

This module isolates the AI features of the application, keeping the core app clean and providing a reusable setup for Vercel AI SDK and Jina Reader ingestion.

## Structure
- `/tools/`: Individual AI tools (e.g. extracting content, summarizing, generating embeddings)
- `/pipelines/`: Orchestration files that chain tools together (e.g. `ingest.ts`)
- `/agents/`: AI SDK Agents definitions (if applicable)

## Technologies
- **Vercel AI SDK**: Core AI interaction library (`@ai-sdk/openai`)
- **Jina Reader (ReaderLM v2)**: URL to Markdown conversion (`r.jina.ai/{url}`)
- **OpenAI**: Base models (`gpt-4o-mini` for text, `text-embedding-3-small` for vectors)