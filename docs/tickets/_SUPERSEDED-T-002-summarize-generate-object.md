# T-002: Migrate `summarize.ts` to `generateObject`

**Status:** todo
**Phase:** 1 — Foundation
**Type:** enhancement
**Risk:** low (single tool change, same model, same pipeline slot)
**Depends on:** T-001 (prompts centralized)

---

## Goal

`summarize.ts` is the only AI tool still using `generateText`. Migrate it to `generateObject` with a Zod schema so we get structured output: a summary **and** key points. This gives us richer data for the reader view and sets the pattern for all future AI tools returning structured results.

---

## Current State

**`tools/summarize.ts`** uses `generateText` → returns a plain `string`.

**`pipelines/ingest.ts:65`** consumes it as:
```ts
const [summary, embedding] = await Promise.all([
  summarizeText(markdown),   // returns string
  generateEmbedding(markdown),
]);
```

Then passes `summary` (string) to:
- `generateTags(markdown, summary)` on line 73
- `extractTopics(markdown, summary)` on line 74
- Transaction `set({ summary, ... })` on line 93

**`prompts.ts`** already has `summarizeSystemPrompt()` and `summarizeUserPrompt()`.

---

## What to Do

### 1. Define the result schema in `summarize.ts`

```ts
import { z } from 'zod';

export const summarizeResultSchema = z.object({
  summary: z.string().describe('A concise 2-4 sentence summary of the content.'),
  keyPoints: z.array(z.string()).describe('3-7 key takeaways or main points.'),
});

export type SummarizeResult = z.infer<typeof summarizeResultSchema>;
```

### 2. Switch from `generateText` to `generateObject`

```ts
import { generateObject } from 'ai';

export async function summarizeText(text: string): Promise<SummarizeResult> {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: summarizeResultSchema,
    system: summarizeSystemPrompt(),
    prompt: summarizeUserPrompt(text),
  });
  return object;
}
```

### 3. Update `summarizeSystemPrompt()` in `prompts.ts`

The current prompt says "concisely summarizes text" — update to instruct for both summary and key points:

```
You are an expert content analyst. Given a piece of content, produce a concise summary and extract the key takeaways. The summary should capture the essence in 2-4 sentences. Key points should be specific, actionable insights — not vague restatements.
```

### 4. Update `ingest.ts` to destructure the new return type

```ts
const [summarizeResult, embedding] = await Promise.all([
  summarizeText(markdown),
  generateEmbedding(markdown),
]);
const { summary, keyPoints } = summarizeResult;
```

- `summary` (string) continues to flow into `generateTags`, `extractTopics`, and the transaction unchanged
- `keyPoints` is extracted but **not persisted yet** (no column exists until T-003). Assign to a variable; log it for verification. It will be wired into the transaction in T-007.

### 5. Update the shared contract type (forward-compatible)

In `packages/shared/src/contracts/entry.contract.ts`, add `keyPoints` to `entrySchema` as optional/nullable so the type is ready when the column lands in T-003:

```ts
keyPoints: z.array(z.string()).nullable().optional(),
```

This has zero effect on the mobile app until we actually populate the field.

---

## Suggestions & Improvements

- **Be specific in the system prompt about what makes a good key point.** Vague prompts produce vague key points like "The article discusses AI." Better: instruct the model to extract *specific claims, numbers, techniques, or actionable insights* — things worth remembering in 6 months.
- **Cap `keyPoints` array length in the schema** with `.min(3).max(7)` — prevents the model from returning 1 generic point or 20 trivial ones. `generateObject` will enforce this via the schema description, and Zod validates it on the response.
- **Consider adding a `tone` field** to the schema (e.g. `'technical' | 'opinion' | 'news' | 'tutorial'`). This costs nothing extra (same API call) and is useful later for filtering and UI treatment. However — if you want to keep this ticket minimal, defer `tone` to a future ticket and just do `summary` + `keyPoints` now.
- **No need to bump the model** — `gpt-4o-mini` handles `generateObject` well and is cheap. We can always swap the model later via a single constant.

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/tools/summarize.ts` | Modify — schema, generateObject, new return type |
| `apps/server/src/modules/ai/prompts.ts` | Modify — update `summarizeSystemPrompt` |
| `apps/server/src/modules/ai/pipelines/ingest.ts` | Modify — destructure `{ summary, keyPoints }` |
| `packages/shared/src/contracts/entry.contract.ts` | Modify — add optional `keyPoints` field |

---

## Definition of Done

- [ ] `summarizeResultSchema` exported from `summarize.ts` with `summary` (string) and `keyPoints` (string[], min 3, max 7)
- [ ] `SummarizeResult` type exported from `summarize.ts`
- [ ] `summarizeText()` uses `generateObject` instead of `generateText`
- [ ] `summarizeText()` return type is `Promise<SummarizeResult>` (not `string`)
- [ ] `summarizeSystemPrompt()` in `prompts.ts` updated to instruct for summary + key points
- [ ] `ingest.ts` destructures `{ summary, keyPoints }` from `summarizeText` result
- [ ] `summary` (string) still flows to `generateTags`, `extractTopics`, and the transaction — no downstream breakage
- [ ] `keyPoints` is extracted into a variable (logged or unused for now — persisted in T-007)
- [ ] `entrySchema` in `entry.contract.ts` has `keyPoints: z.array(z.string()).nullable().optional()`
- [ ] TypeScript compiles with zero errors (`pnpm typecheck`)
- [ ] Pipeline test: ingest a URL entry, verify `summary` is a coherent string and `keyPoints` is logged as an array of 3-7 items

---

## Commit

```
feat(ai): migrate summarize to generateObject with structured output
```
