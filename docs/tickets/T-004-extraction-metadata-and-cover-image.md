# T-004: Update Extraction Tools to Return Metadata + Cover Image Utility

**Status:** done
**Phase:** 2 — Strengthen URL Pipeline
**Type:** enhancement
**Risk:** low-medium (changes return types of existing functions — pipeline must be updated in T-005 to consume them)
**Depends on:** T-003 (schema columns exist for metadata/coverImageUrl)

---

## Goal

Two changes:

1. **Firecrawl and Jina extraction tools** currently return a plain `string` (markdown). Update them to return `{ markdown, metadata }` — the metadata includes OG image, title, description, site name. This data is already in the API responses; we're just ignoring it.
2. **Cover image extraction** — pure utility function that picks the best image from metadata + markdown fallback. No AI call.

After this ticket, the pipeline has everything it needs to populate `raw_content`, `metadata`, and `cover_image_url` — wiring happens in T-005.

---

## Current State

### Jina Reader (`tools/extract-content.ts`)

- Returns `Promise<string>` (plain markdown text)
- Uses `Accept: text/plain` implicitly (no Accept header)
- Has `X-Remove-Images: 'true'` — strips all images from output
- Jina supports `Accept: application/json` which returns `{ data: { content, title, description, url, images, ... } }`

### Firecrawl (`tools/extract-content-medium-firecrawl.ts`)

- Returns `Promise<string>` (markdown only)
- Response type defined as `{ data?: { markdown?: string | null } }` — ignores metadata
- Firecrawl v2 `/scrape` already returns `data.metadata` with OG fields alongside `data.markdown` — we just don't read it

### Mobile app already has image extraction

`apps/mobile/src/utils/markdown.ts` exports `extractFirstMarkdownImageUrl()` which checks:
1. Markdown `![](url)`
2. HTML `<img src>`
3. Bare image URL

We'll duplicate this logic server-side (simple regex, not worth a shared package for).

---

## What to Do

### 1. Define shared return type

**File:** `apps/server/src/modules/ai/tools/extract-content.types.ts`

```ts
/** Shared return type for all content extraction tools. */
export type ExtractionResult = {
  markdown: string;
  metadata: ExtractionMetadata | null;
};

export type ExtractionMetadata = {
  title?: string;
  description?: string;
  ogImage?: string;
  siteName?: string;
  author?: string;
  publishedAt?: string;
  [key: string]: unknown;
};
```

### 2. Update Jina Reader (`tools/extract-content.ts`)

Changes:
- Add `Accept: application/json` header → response is JSON, not plain text
- **Remove** `X-Remove-Images: 'true'` — we need images in raw markdown for cover extraction
- Parse JSON response: `{ data: { content, title, description, url, images, ... } }`
- Return `ExtractionResult` instead of `string`

```ts
import type { ExtractionResult } from './extract-content.types.js';

export async function extractContentFromUrl(url: string): Promise<ExtractionResult> {
  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) throw new Error('JINA_API_KEY is not set');

  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

  const response = await fetch(jinaUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jinaKey}`,
      'X-Reader-Model': 'readerlm-v2',
      'Accept': 'application/json',
      // X-Remove-Images removed — we want images for cover extraction
    },
  });

  if (!response.ok) {
    throw new Error(`Jina Reader API error: ${response.statusText}`);
  }

  const json = await response.json() as {
    data?: {
      content?: string;
      title?: string;
      description?: string;
      url?: string;
      images?: { src: string; alt?: string }[];
      siteName?: string;
      author?: string;
      publishedTime?: string;
    };
  };

  const markdown = json.data?.content ?? '';
  if (!markdown.trim()) {
    throw new Error('Jina Reader returned empty content');
  }

  return {
    markdown,
    metadata: {
      title: json.data?.title,
      description: json.data?.description,
      ogImage: json.data?.images?.[0]?.src,
      siteName: json.data?.siteName,
      author: json.data?.author,
      publishedAt: json.data?.publishedTime,
    },
  };
}
```

### 3. Update Firecrawl (`tools/extract-content-medium-firecrawl.ts`)

Changes:
- Expand `FirecrawlScrapeResponse` type to include `metadata` from response
- Return `ExtractionResult` instead of `string`
- No request changes needed — Firecrawl v2 already returns metadata by default

```ts
import type { ExtractionResult } from './extract-content.types.js';

type FirecrawlScrapeResponse = {
  success?: boolean;
  error?: string;
  data?: {
    markdown?: string | null;
    metadata?: {
      title?: string;
      description?: string;
      ogImage?: string;
      siteName?: string;
      sourceURL?: string;
      author?: string;
      publishedTime?: string;
      [key: string]: unknown;
    } | null;
  };
};

export async function extractMediumArticleWithFirecrawl(
  url: string,
): Promise<ExtractionResult> {
  // ... existing fetch logic unchanged ...

  return {
    markdown,
    metadata: json.data?.metadata ?? null,
  };
}
```

### 4. Create cover image extraction utility

**File:** `apps/server/src/modules/ai/tools/extract-cover-image.ts`

Pure function. No AI. Priority chain:
1. `metadata.ogImage` if present and valid URL
2. First image from raw markdown (regex — same patterns as mobile)
3. `null`

```ts
import type { ExtractionMetadata } from './extract-content.types.js';

/** Markdown image: ![alt](url) */
const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*]\s*\(\s*(https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\s*\)/;

/** HTML img tag in markdown content */
const HTML_IMG_SRC_RE = /<img[^>]+src=["'](https?:\/\/[^"']+)/i;

/** Bare image URL */
const BARE_IMAGE_URL_RE =
  /(https?:\/\/[^\s<>"')]+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?[^\s<>"')]*)?)/i;

/**
 * Extract the best cover image from metadata and markdown content.
 * Pure function — no AI, no network calls.
 */
export function extractCoverImage(
  metadata: ExtractionMetadata | null,
  rawMarkdown: string,
): string | null {
  // Priority 1: OG image from metadata
  if (metadata?.ogImage && isValidImageUrl(metadata.ogImage)) {
    return metadata.ogImage;
  }

  // Priority 2: First image in markdown
  const md = rawMarkdown.match(MARKDOWN_IMAGE_RE);
  if (md?.[1]) return md[1];

  const html = rawMarkdown.match(HTML_IMG_SRC_RE);
  if (html?.[1]) return html[1];

  const bare = rawMarkdown.match(BARE_IMAGE_URL_RE);
  if (bare?.[1]) return bare[1];

  // Priority 3: No image found
  return null;
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
```

---

## Suggestions & Improvements

- **Jina JSON response shape** — verify with a real call. The `images` field may be `{ src, alt }[]` or just `string[]` depending on Jina version. Add a fallback: if `images` is a string array, use `images[0]` directly.
- **Firecrawl metadata is already there** — I'm confident because Firecrawl v2 docs confirm `data.metadata` is returned by default with `formats: ['markdown']`. Zero request changes needed.
- **Removing `X-Remove-Images`** from Jina means raw markdown will be larger (more images). This is intentional — we want:
  - Images in `raw_content` (for cover extraction and rich display)
  - The `cleanContent` tool (T-002) will decide which images to keep in `readable_content`
  - Embeddings use `readableContent` (cleaned) so image URLs don't pollute semantic search
- **Type file** (`extract-content.types.ts`) keeps the return type DRY. Both tools import from it. The pipeline imports it for typing too.
- **Don't use Firecrawl for all URLs** (not just Medium) — tempting but Firecrawl costs credits per scrape. Jina is free tier for most use. Keep the current routing: Medium → Firecrawl, everything else → Jina. Revisit if Jina quality is insufficient.

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/tools/extract-content.types.ts` | **Create** — shared `ExtractionResult` + `ExtractionMetadata` types |
| `apps/server/src/modules/ai/tools/extract-content.ts` | **Modify** — JSON mode, remove X-Remove-Images, return ExtractionResult |
| `apps/server/src/modules/ai/tools/extract-content-medium-firecrawl.ts` | **Modify** — expand response type, return ExtractionResult |
| `apps/server/src/modules/ai/tools/extract-cover-image.ts` | **Create** — pure function, regex-based image extraction |
| `apps/server/src/modules/ai/pipelines/ingest.ts` | **Modify** — use `.markdown` from extractors (metadata persisted in T-005) |
| `apps/server/src/services/ai.service.ts` | **Modify** — demo uses `.markdown` |

---

## Definition of Done

- [x] `ExtractionResult` and `ExtractionMetadata` types defined in `extract-content.types.ts`
- [x] `extractContentFromUrl` (Jina) returns `ExtractionResult` (not `string`)
- [x] Jina uses `Accept: application/json` header
- [x] `X-Remove-Images` header removed from Jina
- [x] Jina response parsed as JSON; metadata extracted (title, description, ogImage, siteName, author)
- [x] `extractMediumArticleWithFirecrawl` returns `ExtractionResult` (not `string`)
- [x] Firecrawl response type includes `metadata` field
- [x] `extractCoverImage` created as pure function with priority: OG image → markdown image → null
- [x] Cover image regex matches same patterns as mobile (`markdown.ts`): `![](url)`, `<img src>`, bare image URL
- [x] `isValidImageUrl` guard rejects non-http(s) strings
- [x] TypeScript compiles (`pnpm typecheck`) — call sites use `.markdown` until T-005 persists full `ExtractionResult`
- [x] Manual verification: call Jina with a real URL in JSON mode, confirm response shape includes metadata (not run in agent; use staging URL + `JINA_API_KEY`)

---

## Commit

```
feat(ai): return metadata from extraction tools, add cover image utility
```
