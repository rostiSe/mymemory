# T-001: Centralize AI Prompts

**Status:** done
**Phase:** 1 — Foundation
**Type:** refactor
**Risk:** low (pure extraction, no behavior change)

---

## Goal

All AI prompts are currently inline strings scattered across 3 tool files. Extract them into a single `prompts.ts` module so they're easy to find, tweak, version, and test independently of tool logic.

---

## Current State

| Tool file | System prompt | User prompt |
|-----------|--------------|-------------|
| `tools/summarize.ts:9` | `"You are a helpful assistant that concisely summarizes text."` | `` `Summarize the following text:\n\n${text}` `` |
| `tools/generate-tags.ts:12` | `"You are an expert content categorizer..."` | Template with `existingTags`, `summary`, `markdown.slice(0, 4000)` |
| `tools/extract-topics.ts:12` | `"You are an expert content analyzer..."` | Template with `existingTopics`, `summary`, `markdown.slice(0, 4000)` |

---

## What to Do

1. **Create** `apps/server/src/modules/ai/prompts.ts`
2. Export **builder functions** (not raw strings) — one per prompt, accepting the dynamic parts as typed arguments:
   - `summarizeSystemPrompt(): string`
   - `summarizeUserPrompt(text: string): string`
   - `generateTagsSystemPrompt(): string`
   - `generateTagsUserPrompt(opts: { markdown: string; summary: string; existingTags: string[] }): string`
   - `extractTopicsSystemPrompt(): string`
   - `extractTopicsUserPrompt(opts: { markdown: string; summary: string; existingTopics: string[] }): string`
3. **Update** `summarize.ts`, `generate-tags.ts`, `extract-topics.ts` to import from `../prompts.js` and delete their inline strings
4. Keep **all logic, schemas, model selection, and return types identical** — this is prompt extraction only

---

## Suggestions & Improvements

- **Use option objects** instead of positional args for user prompts (e.g. `{ markdown, summary, existingTags }`) — more readable and extensible when we add new context fields later.
- **Content truncation belongs in the prompt builder**, not the tool. Move `markdown.slice(0, 4000)` into `generateTagsUserPrompt` and `extractTopicsUserPrompt` so the tool just passes the full markdown. Add a `MAX_CONTENT_CHARS` constant at the top of `prompts.ts` (currently 4000, but we'll increase it later when switching to readable content).
- **Add a `cleanContentSystemPrompt()` and `cleanContentUserPrompt()` stub** (empty or with a TODO comment) — Step 4 will need them and it keeps the file as the single home for all prompts from day one.
- **Consider a short JSDoc on each builder** explaining what the prompt does and which tool uses it — makes the file self-documenting as a prompt catalog.

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/prompts.ts` | Create |
| `apps/server/src/modules/ai/tools/summarize.ts` | Modify — import prompts, remove inline strings |
| `apps/server/src/modules/ai/tools/generate-tags.ts` | Modify — import prompts, remove inline strings, move slice logic |
| `apps/server/src/modules/ai/tools/extract-topics.ts` | Modify — import prompts, remove inline strings, move slice logic |

---

## Definition of Done

- [x] `prompts.ts` exists with all 6 builder functions (+ clean-content stubs)
- [x] `summarize.ts` has zero inline prompt strings — imports from `prompts.ts`
- [x] `generate-tags.ts` has zero inline prompt strings — imports from `prompts.ts`
- [x] `extract-topics.ts` has zero inline prompt strings — imports from `prompts.ts`
- [x] Content truncation (`slice(0, 4000)`) lives in the prompt builder, not the tool
- [x] `MAX_CONTENT_CHARS` constant exported from `prompts.ts`
- [x] All tool function signatures and return types unchanged
- [x] Zod schemas remain in their respective tool files (not moved)
- [x] Pipeline runs identically — no behavioral change
- [x] TypeScript compiles with zero errors (`pnpm typecheck`)

---

## Commit

```
refactor(ai): centralize prompts into prompts.ts
```
