# T-002: AI SDK v6 Migration + Tool Consolidation (analyzeContent + cleanContent)

**Status:** done
**Phase:** 1 — Foundation
**Type:** enhancement + migration
**Risk:** medium (API migration + tool consolidation in one step, but all server-side)
**Depends on:** T-001 (prompts centralized)

---

## Goal

Three things converge into one ticket:

1. **AI SDK v6 migration** — `generateObject` is deprecated in v6.0.146. All structured output must move to `generateText` + `Output.object`.
2. **Tool consolidation** — `summarize.ts`, `generate-tags.ts`, and `extract-topics.ts` all analyze the same markdown. Combine into one `analyzeContent` call: 1 LLM call instead of 3.
3. **Noise removal** — Add `cleanContent` tool that strips nav, ads, boilerplate from raw scraped markdown before analysis.

**Result:** Pipeline goes from 3 LLM calls + 1 embed to 2 LLM calls + 1 embed. Cleaner input = better output everywhere.

---

## Current State

### API usage (all deprecated pattern)

| Tool | Import | Pattern |
|------|--------|---------|
| `summarize.ts` | `generateText` from `'ai'` | `generateText({ model, system, prompt })` → `{ text }` — no structured output |
| `generate-tags.ts` | `generateObject` from `'ai'` | `generateObject({ model, schema, system, prompt })` → `{ object }` — **deprecated** |
| `extract-topics.ts` | `generateObject` from `'ai'` | `generateObject({ model, schema, system, prompt })` → `{ object }` — **deprecated** |

### Pipeline consumption (`ingest.ts`)

```
line 65: const [summary, embedding] = await Promise.all([summarizeText(markdown), generateEmbedding(markdown)])
line 73: const [generatedTags, extractedTopics] = await Promise.all([generateTags(markdown, summary), extractTopics(markdown, summary)])
```

Tags and topics depend on `summary` → sequential after summarize. After consolidation, this dependency disappears.

---

## AI SDK v6 Pattern

```ts
// generateObject (DEPRECATED, will be removed)
import { generateObject } from 'ai';
const { object } = await generateObject({ model, schema, system, prompt });

// AI SDK v6 — correct pattern
import { generateText, Output } from 'ai';
const { output } = await generateText({
  model,
  output: Output.object({ schema }),
  system,
  prompt,
});
```

Key differences:
- Import `Output` from `'ai'`
- Use `generateText` with `output: Output.object({ schema })`
- Result is on `output` property (not `object`)
- Error type: `NoObjectGeneratedError` (import from `'ai'`)
- `.describe()` on Zod properties gives the model hints — use for all fields

---

## What to Do

### 1. Create `tools/analyze-content.ts`

Single tool that replaces `summarize.ts`, `generate-tags.ts`, and `extract-topics.ts` in the pipeline.

**Schema:**

```ts
import { z } from 'zod';

export const analyzeContentSchema = z.object({
  summary: z.string().describe(
    'A concise 2-4 sentence summary capturing the essence of the content.'
  ),
  keyPoints: z.array(z.string()).min(3).max(7).describe(
    'Key takeaways: specific claims, numbers, techniques, or actionable insights worth remembering.'
  ),
  tags: z.array(z.string()).describe(
    'Lowercase, concise tags that categorize the content. Prefer reusing existing tags when relevant.'
  ),
  topics: z.array(
    z.object({
      name: z.string().describe('Topic name, e.g. "React Native", "Artificial Intelligence"'),
      description: z.string().describe('One sentence on why this topic is relevant to the content.'),
    })
  ).min(1).max(5).describe(
    'Primary topics discussed in the content.'
  ),
});

export type AnalyzeContentResult = z.infer<typeof analyzeContentSchema>;
```

**Function:**

```ts
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  analyzeContentSystemPrompt,
  analyzeContentUserPrompt,
} from '../prompts.js';

export async function analyzeContent(opts: {
  markdown: string;
  existingTags?: string[];
  existingTopics?: string[];
}): Promise<AnalyzeContentResult> {
  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({
        name: 'ContentAnalysis',
        description: 'Structured analysis of a piece of content.',
        schema: analyzeContentSchema,
      }),
      system: analyzeContentSystemPrompt(),
      prompt: analyzeContentUserPrompt(opts),
    });

    if (!output) {
      throw new Error('analyzeContent: model returned no structured output');
    }

    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('analyzeContent failed to generate valid object:', error.cause);
      console.error('Raw text:', error.text);
    }
    throw error;
  }
}
```

### 2. Create `tools/clean-content.ts`

Noise remover — takes raw scraped markdown, returns clean readable markdown.

**Schema:**

```ts
const cleanContentSchema = z.object({
  readableContent: z.string().describe(
    'The cleaned markdown with navigation, ads, cookie banners, sidebars, footers, and boilerplate removed. Preserve article headings, paragraphs, code blocks, lists, and meaningful images.'
  ),
});
```

**Function:**

```ts
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { cleanContentSystemPrompt, cleanContentUserPrompt } from '../prompts.js';

/** Max raw chars to send to the cleaning model (cost guard). */
const MAX_RAW_CHARS = 80_000;

export async function cleanContent(rawMarkdown: string): Promise<string> {
  const input = rawMarkdown.length > MAX_RAW_CHARS
    ? rawMarkdown.slice(0, MAX_RAW_CHARS)
    : rawMarkdown;

  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({
      name: 'CleanContent',
      description: 'Noise-removed readable markdown.',
      schema: cleanContentSchema,
    }),
    system: cleanContentSystemPrompt(),
    prompt: cleanContentUserPrompt(input),
  });

  if (!output) {
    throw new Error('cleanContent: model returned no structured output');
  }

  return output.readableContent;
}
```

### 3. Update `prompts.ts`

Replace the clean-content stubs with real prompts. Add new `analyzeContent` prompts.

**`analyzeContentSystemPrompt`:**
```
You are an expert content analyst. Given a piece of content, produce a structured analysis:
a concise summary, key takeaways (specific claims, numbers, or techniques — not vague restatements),
relevant tags for categorization, and the primary topics discussed.
When existing tags or topics are provided, prefer reusing them over inventing new ones.
```

**`analyzeContentUserPrompt`:**
Accepts `{ markdown, existingTags, existingTopics }`. Truncates markdown to `MAX_CONTENT_CHARS`. Includes existing tags/topics lists when non-empty.

**`cleanContentSystemPrompt`:**
```
You are an expert content cleaner. Given raw scraped markdown from a web page,
remove: navigation menus, header/footer boilerplate, advertisements, cookie/consent banners,
sidebar content, social sharing buttons, related article links, comment sections,
and subscription prompts. Preserve: the main article content, headings, paragraphs,
code blocks, blockquotes, lists, tables, and meaningful images (keep their markdown syntax).
Return clean, well-structured markdown.
```

**`cleanContentUserPrompt`:**
```
Clean the following raw scraped markdown:\n\n${rawMarkdown}
```

### 4. Migrate existing `generate-tags.ts` and `extract-topics.ts` to v6 API

These files are **not deleted** — they remain available for standalone use (e.g. re-tagging a single entry without re-summarizing). But they must migrate off the deprecated `generateObject`.

```ts
// Before (deprecated)
import { generateObject } from 'ai';
const { object } = await generateObject({ model, schema, system, prompt });
return object.tags;

// After (v6)
import { generateText, Output } from 'ai';
const { output } = await generateText({
  model,
  output: Output.object({ schema }),
  system,
  prompt,
});
return output!.tags;
```

Same for `extract-topics.ts`.

### 5. Do NOT delete `summarize.ts`, `generate-tags.ts`, `extract-topics.ts`

Keep them as standalone utilities (migrated to v6 API). The pipeline will use `analyzeContent` instead, but the individual tools remain for:
- Re-running a single step (e.g. re-tag without re-summarize)
- Testing individual outputs
- Future per-type pipelines that may not need all four outputs

---

## Suggestions & Improvements

- **`Output.object` accepts `name` and `description`** — use them. Some providers (OpenAI) pass these as tool/schema metadata to the model, improving output quality.
- **`NoObjectGeneratedError`** — import from `'ai'` and handle explicitly. Log `error.text` (what the model actually returned) and `error.cause` (parsing failure reason). This is crucial for debugging bad outputs in production.
- **Existing tags/topics passthrough** — `ingest.ts` currently passes empty arrays (comment on line 72: "skipping for brevity"). The `analyzeContent` prompt should include them when available. Consider fetching them in the pipeline before calling `analyzeContent`. This is an improvement over current behavior but not blocking for this ticket — can be a follow-up.
- **Don't over-constrain `keyPoints`** — `.min(3).max(7)` is enforced by Zod on the response. For very short content (a tweet, a quote), 3 key points may be forced/redundant. Consider `.min(1).max(7)` with a prompt instruction "aim for 3-7 points, fewer for shorter content."
- **The `MAX_CONTENT_CHARS` in `prompts.ts` (4000)** should be raised for the combined `analyzeContent` call. Since we're making 1 call instead of 3, we can afford more input context. Suggest raising to 8000-12000 for the analysis prompt. The model sees more content → better tags and topics.

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/tools/analyze-content.ts` | **Create** — combined analysis tool |
| `apps/server/src/modules/ai/tools/clean-content.ts` | **Create** — noise removal tool |
| `apps/server/src/modules/ai/prompts.ts` | **Modify** — add analyzeContent prompts, fill cleanContent prompts, raise MAX_CONTENT_CHARS |
| `apps/server/src/modules/ai/tools/summarize.ts` | **Modify** — migrate to v6 API (keep as standalone) |
| `apps/server/src/modules/ai/tools/generate-tags.ts` | **Modify** — migrate to v6 API (keep as standalone) |
| `apps/server/src/modules/ai/tools/extract-topics.ts` | **Modify** — migrate to v6 API (keep as standalone) |

**Note:** `ingest.ts` is NOT modified in this ticket. Pipeline rewiring happens in a later ticket after schema columns exist.

---

## Definition of Done

- [x] `analyze-content.ts` created with `analyzeContentSchema` and `analyzeContent()` function
- [x] Uses `generateText` + `Output.object` (v6 API), not `generateObject`
- [x] Schema has `summary`, `keyPoints`, `tags`, `topics` with `.describe()` on all fields
- [x] `NoObjectGeneratedError` handled with `error.text` and `error.cause` logging
- [x] `Output.object` uses `name` and `description` for provider hints
- [x] `clean-content.ts` created with `cleanContent()` function using v6 API
- [x] `cleanContent` has `MAX_RAW_CHARS` guard (80,000 chars)
- [x] `prompts.ts` updated: `analyzeContentSystemPrompt`, `analyzeContentUserPrompt`, `cleanContentSystemPrompt`, `cleanContentUserPrompt`
- [x] `MAX_CONTENT_CHARS` raised from 4000 to 8000+ for analysis prompt
- [x] `summarize.ts` migrated to v6 API (`generateText` + `Output.object`)
- [x] `generate-tags.ts` migrated to v6 API
- [x] `extract-topics.ts` migrated to v6 API
- [x] No file deleted — old tools remain as standalone utilities
- [x] Zero imports of `generateObject` remain in the codebase
- [x] TypeScript compiles with zero errors (`pnpm typecheck`)
- [x] Manual test: call `analyzeContent` directly with sample markdown, verify output shape (module + schema load verified; run with `OPENAI_API_KEY` for a live call)

---

## Commit

```
feat(ai): add analyzeContent + cleanContent tools, migrate all AI tools to SDK v6 API
```
