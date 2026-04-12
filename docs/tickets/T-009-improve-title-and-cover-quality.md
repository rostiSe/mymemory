# T-009: Improve Title & Cover Image Quality

**Status:** todo
**Phase:** 2 — Strengthen URL Pipeline (patch)
**Type:** enhancement (server-only — AI pipeline)
**Risk:** low (extends existing analyzeContent schema + prompts, no new LLM calls)
**Depends on:** T-002 (analyzeContent tool exists), T-005 (pipeline wired)

---

## Problem

**Title:** The entry title comes entirely from page metadata (`<title>` tag via Jina/Firecrawl). Many sites have poor `<title>` tags — just the domain name, a URL slug, or generic boilerplate like "Home | SiteName". There is **no AI fallback** — if the metadata title is bad, the feed shows the raw URL.

**Cover image:** The cover image uses the OG image (`og:image`) as highest priority. Most sites set their OG image to their logo, favicon, or a generic brand banner — not a content-relevant image. The current fallback chain (`ogImage → markdown image → HTML img → bare URL`) has no quality filter, so logos and icons regularly appear as "cover images."

---

## Current State

**`analyzeContent` schema** (`tools/analyze-content.ts`, lines 10-43):
- Generates: `summary`, `keyPoints`, `tags`, `topics`, `language`
- Does NOT generate: `title` or any image selection

**`analyzeContent` prompts** (`prompts.ts`, lines 54-59):
- System prompt instructs: summary, key takeaways, tags, topics, language code
- No mention of title generation or image selection

**Title flow** (`pipelines/ingest.ts`, lines 109-129):
- `metadataTitle` extracted from `extractionMetadata.title` (Jina/Firecrawl page `<title>`)
- If entry already has a user-provided title → keep it
- If no user title but metadataTitle exists → use metadataTitle
- If neither → title stays null (feed shows raw URL via `item.title || item.url || "Untitled"`)

**Cover image flow** (`pipelines/ingest.ts`, line 106 + `tools/extract-cover-image.ts`):
- `extractCoverImage(metadata, rawMarkdown)` — pure function, priority:
  1. `metadata.ogImage` (no quality check — logos pass through)
  2. First markdown image `![](url)`
  3. First HTML `<img src>`
  4. First bare image URL with image extension
- No filtering for logos, icons, or tiny images

---

## What to Do

### 1. Add `title` and `heroImageUrl` to `analyzeContentSchema`

**File:** `apps/server/src/modules/ai/tools/analyze-content.ts`

Add two fields to the schema (after `language`):

```ts
title: z
  .string()
  .describe(
    'A concise, descriptive headline (5-12 words) that captures the main point of the content. '
    + 'Write it like a newspaper headline — clear, specific, informative. '
    + 'Do NOT use the site name, domain, or generic phrases like "Home" or "Welcome".',
  ),
heroImageUrl: z
  .string()
  .url()
  .nullable()
  .describe(
    'The URL of the most visually relevant content image from the markdown — a photo, diagram, '
    + 'illustration, or chart that represents the article\'s subject. '
    + 'Return null if no suitable image exists. '
    + 'EXCLUDE: site logos, favicons, author avatars, social media icons, '
    + 'tracking pixels, ads, and generic stock banners.',
  ),
```

**Why nullable for `heroImageUrl`:** Many articles genuinely have no content images. The LLM should return `null` rather than picking a logo as a last resort.

### 2. Update the system prompt

**File:** `apps/server/src/modules/ai/prompts.ts`

Update `analyzeContentSystemPrompt()` (lines 54-58) to mention the new fields:

```ts
export function analyzeContentSystemPrompt(): string {
  return `You are an expert content analyst. Given a piece of content, produce a structured analysis:
a concise descriptive headline (not the site name or a URL — a real headline capturing the main point),
a concise summary, key takeaways (specific claims, numbers, or techniques — not vague restatements),
relevant tags for categorization, the primary topics discussed, the ISO 639-1 language code,
and the URL of the best content image if one exists (not logos, avatars, or icons).
When existing tags or topics are provided, prefer reusing them over inventing new ones.`;
}
```

### 3. Pass image URLs to the LLM for hero selection

**File:** `apps/server/src/modules/ai/prompts.ts`

Update `AnalyzeContentUserPromptOpts` to accept an optional list of image URLs found in the content, so the LLM can pick from them:

```ts
export type AnalyzeContentUserPromptOpts = {
  markdown: string;
  existingTags?: string[];
  existingTopics?: string[];
  imageUrls?: string[];  // All image URLs found in the content
};
```

In `analyzeContentUserPrompt`, add an image URL section when available:

```ts
if (opts.imageUrls?.length) {
  sections.push(
    `Image URLs found in the content (pick the best content image, or null if none are suitable):\n${opts.imageUrls.join('\n')}`,
  );
}
```

### 4. Extract image URLs before calling analyzeContent

**File:** `apps/server/src/modules/ai/pipelines/ingest.ts`

Before the `analyzeContent` call, collect all image URLs from the markdown + metadata:

```ts
const imageUrls = collectImageUrls(extractionMetadata, rawMarkdown);
```

Add a helper (can live in `extract-cover-image.ts` or inline):

```ts
function collectImageUrls(
  metadata: ExtractionMetadata | null,
  markdown: string,
): string[] {
  const urls = new Set<string>();
  if (metadata?.ogImage) urls.add(metadata.ogImage);

  // All markdown images
  const mdRegex = /!\[[^\]]*]\s*\(\s*(https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  for (const match of markdown.matchAll(mdRegex)) {
    if (match[1]) urls.add(match[1]);
  }

  // All HTML img tags
  const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)/gi;
  for (const match of markdown.matchAll(htmlRegex)) {
    if (match[1]) urls.add(match[1]);
  }

  return [...urls];
}
```

Pass to analyzeContent:

```ts
const [analysis, embedding] = await Promise.all([
  analyzeContent({
    markdown: readableContent,
    existingTags,
    existingTopics,
    imageUrls,
  }),
  generateEmbedding(readableContent),
]);
```

### 5. Use AI title and hero image with smart fallback in the pipeline

**File:** `apps/server/src/modules/ai/pipelines/ingest.ts`

Update destructuring (lines 98-104):

```ts
const {
  summary,
  keyPoints,
  tags: generatedTags,
  topics: extractedTopics,
  language,
  title: generatedTitle,
  heroImageUrl,
} = analysis;
```

**Title logic** — replace lines 109-129 title handling:

```ts
// Title priority: user-provided > AI-generated > metadata (if not URL-like) > null
const metadataTitle =
  extractionMetadata?.title?.trim() || null;

const isMetadataTitleUseful =
  metadataTitle &&
  !looksLikeUrl(metadataTitle) &&
  !looksLikeBoilerplate(metadataTitle);

const resolvedTitle = entry.title?.trim()
  ? undefined                              // keep user title — don't include in SET
  : generatedTitle                         // prefer AI title
    ?? (isMetadataTitleUseful ? metadataTitle : null);
```

Add helpers (in `ingest.ts` or a small util):

```ts
function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//.test(text) || /^www\./.test(text);
}

function looksLikeBoilerplate(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower === 'home' ||
    lower === 'untitled' ||
    lower.length < 3 ||
    // Just a domain: "example.com" or "Example.com - Home"
    /^[a-z0-9.-]+\.(com|org|net|io|dev|co)\b/i.test(text)
  );
}
```

**Cover image logic** — replace line 106:

```ts
// Cover image priority: AI hero pick > extracted cover (with logo filter)
const extractedCover = extractCoverImage(extractionMetadata, rawMarkdown);
const resolvedCoverImageUrl = heroImageUrl ?? extractedCover;
```

The LLM's `heroImageUrl` already excludes logos (via schema description). The `extractCoverImage` fallback still catches cases where the LLM returns null but there's a valid content image it missed.

**Transaction update** — adjust the SET:

```ts
await tx
  .update(entries)
  .set({
    ...(resolvedTitle !== undefined ? { title: resolvedTitle } : {}),
    content: readableContent,
    rawContent: rawMarkdown,
    readableContent,
    coverImageUrl: resolvedCoverImageUrl,
    // ... rest unchanged
  })
  .where(eq(entries.id, entryId));
```

---

## Suggestions & Improvements

- **Zero extra LLM calls** — title and heroImageUrl are added to the existing `analyzeContent` call. The schema gets two more fields; gpt-4o-mini handles this with negligible latency increase.
- **AI title as primary, not fallback** — the LLM sees the actual content and generates a descriptive headline. Metadata titles are often SEO-optimized garbage or just the domain. The AI title will almost always be better for a personal knowledge base.
- **`heroImageUrl` is nullable** — the LLM should return null when there's no good content image rather than picking a logo. This is better than the current behavior where `extractCoverImage` always picks *something* (even a tracking pixel with `.png` extension).
- **Image URL list helps the LLM** — passing the collected image URLs as a structured list (separate from the markdown) makes it easier for the model to evaluate and pick, rather than parsing them out of markdown syntax.
- **`looksLikeUrl` / `looksLikeBoilerplate`** guards are only for the metadata title fallback. The AI-generated title doesn't need these checks since the schema description instructs the model clearly.
- **Existing entries** — this change only affects new ingestions and retries. To fix existing entries with bad titles/covers, a migration script could re-run `analyzeContent` on entries where `title` looks like a URL. Out of scope for this ticket.

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/tools/analyze-content.ts` | **Modify** — add `title` and `heroImageUrl` to schema |
| `apps/server/src/modules/ai/prompts.ts` | **Modify** — update system prompt, add `imageUrls` to user prompt opts |
| `apps/server/src/modules/ai/pipelines/ingest.ts` | **Modify** — collect image URLs, use AI title/hero with smart fallback |
| `apps/server/src/modules/ai/tools/extract-cover-image.ts` | **Modify** — export `collectImageUrls` helper (optional, could be inline) |

---

## Definition of Done

- [ ] `analyzeContentSchema` has `title: z.string()` field with descriptive `.describe()`
- [ ] `analyzeContentSchema` has `heroImageUrl: z.string().url().nullable()` field with descriptive `.describe()`
- [ ] `AnalyzeContentResult` type includes `title` and `heroImageUrl` (inferred automatically)
- [ ] System prompt updated to mention headline generation and image selection
- [ ] User prompt includes image URL list when available
- [ ] `analyzeContent` function accepts optional `imageUrls` param
- [ ] Pipeline collects all image URLs from metadata + markdown before calling analyzeContent
- [ ] Pipeline uses AI `title` as primary title source (when no user-provided title)
- [ ] Pipeline falls back to metadata title only when AI title is missing AND metadata title passes quality checks
- [ ] `looksLikeUrl()` rejects titles that are just URLs
- [ ] `looksLikeBoilerplate()` rejects titles like "Home", domain names, very short strings
- [ ] Pipeline uses AI `heroImageUrl` as primary cover image
- [ ] Pipeline falls back to `extractCoverImage()` when AI returns null
- [ ] `pnpm typecheck` passes across all workspaces
- [ ] Manual test: ingest a URL with bad `<title>` tag → entry gets a descriptive AI-generated title
- [ ] Manual test: ingest a URL with logo as OG image → entry gets a content-relevant hero image (or no image if none exists)
- [ ] Manual test: ingest a URL with good title and good OG image → AI title still used (better quality), AI hero image used
- [ ] Manual test: entry with user-provided title → user title preserved, not overwritten

---

## Commit

```
fix(ai): generate descriptive titles and pick content-relevant cover images via LLM
```
