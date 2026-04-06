# @mymemory/server

## Vercel Deployment

This server is deployed to Vercel (Node.js Serverless Functions).

1. The Vercel project should have its **Root Directory** set to `apps/server`.
2. The framework preset should be **Other** (or Node.js).
3. Build Command: `pnpm run build` (or `turbo run build --filter=@mymemory/server`).

### Environment Variables

You must configure the following environment variables in the Vercel dashboard:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `JINA_API_KEY` (if used for demo URL ingestion)
- `EXPO_PUBLIC_API_URL` (optional on server, but typically shared in the monorepo)

To deploy from CLI:
```bash
pnpm dlx vercel deploy --cwd apps/server
```
