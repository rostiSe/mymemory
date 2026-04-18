# T-016: Ingest Strengthening (epic)

**Status:** in-progress
**Phase:** 5 — Ingest
**Type:** epic (schema + server + mobile)
**Depends on:** T-015 Wiki Agent foundation (shared AI module, oRPC pattern, Trigger.dev)

---

## Goal

Transform MyMemory's ingest pipeline from a URL-only tool into a general-purpose capture engine that handles **every natural way a human saves a thought** — links, videos, social posts, images, voice memos, shared text — each routed to a specialised extraction pipeline but producing a **consistent enrichment output** (summary, keyPoints, topics, tags, embedding) that every downstream system (wiki, spaces, feed) consumes uniformly.

Also introduces two cross-cutting concerns:
- **Sources as first-class entities** (Medium, Substack, Reddit, …) — auto-detected, user-nameable, per-user scoped
- **Wiki acceptance gate** — only entries explicitly flagged `kept` feed the Curator, so the wiki stops being noisy

---

## Delivery strategy — vertical slice, then replicate

This epic is **not** a parallel fan-out of 10 tickets. It's **foundation + one deep vertical slice + replication**:

1. **Foundation** (T-016a–d) — schema, server pipeline registry, mobile renderer registry, capture composer shell. These define the *template* every content type will follow.
2. **Vertical slice** (T-016e) — YouTube, end-to-end: detect → extract transcript → enrich → persist, plus FeedCard + DetailView + ProcessingCard + FailureCard. This is the reference implementation.
3. **Replication** (T-016f–m) — every other content type is a drop-in copy of the YouTube folder structure, with its own handler + renderer. No new infrastructure per type.

Why this shape: "write 10 tickets in parallel" produces 10 generic specs that all need rewriting once we see what the first real type wants to be. Going narrow and deep on YouTube first teaches us the visual + pipeline vocabulary; replication is then mechanical.

---

## Conceptual model

```
Primitive capture surfaces (how the user inputs)      Axes are orthogonal.
    │                                                 A URL pointing at photo.jpg
    ├─ URL    (typed / pasted / share intent)         resolves to `image` and renders
    │         → article | video | social | product    through the image renderer —
    │         → image | audio  (when URL is binary)   same as a file-picked photo.
    │
    ├─ File   (camera, Files app, in-app recorder — distinguished by mime type)
    │         → image (image/*)
    │         → audio (audio/*)  — incl. voice memos
    │         → video (video/*)  (deferred)
    │
    └─ Text   (share intent paste buffer, in-app writing)
              → quote | snippet | note

Every resolved type produces the same enrichment output shape:
  { summary, keyPoints, topics[], tags[], embedding, acceptanceScore, sourceId? }
```

**Three layers:**
- **`entryType`** (`url` | `file` | `text`) — how the user captured it. 3 primitives, not 4: audio is a file with audio mime type; there's no separate "audio capture surface".
- **`resolvedType`** (`article` | `video` | `social` | `product` | `image` | `audio` | `quote` | `snippet` | `note`) — what the system extracted. Independent of capture surface.
- **`sourceId`** (FK to `sources`) — who published it (Medium, Reddit, Self)

---

## Architecture — the two registries

### Server registry

```
apps/server/src/modules/ingest/
  constants.ts                        # every number, timeout, limit
  types.ts                            # ContentTypeHandler<TMedia> interface
  registry.ts                         # resolvedType → handler
  pipeline/
    runner.ts                         # orchestrates the ordered steps
    steps/                            # each step is pure + testable
      detect-resolved-type.ts         # URL parsers, MIME sniff → resolvedType
      run-extraction.ts               # dispatches to handler.extract
      run-enrichment.ts               # shared AI (summary/topics/tags/embedding)
      run-classification.ts           # space classification
      persist-entry.ts                # DB writes
      finalize-ingest-run.ts          # closes ingestRuns row
  handlers/
    video-youtube/                    # one folder per resolvedType
      detect.ts                       # isYouTubeUrl, parseTimestamp
      extract.ts                      # transcript + metadata fetch
      handler.ts                      # implements ContentTypeHandler
      prompts.ts                      # per-type system prompts
      constants.ts                    # per-handler limits/timeouts
      types.ts                        # narrow type re-exports
```

**`ContentTypeHandler`** interface (stable contract for every type):
```ts
interface ContentTypeHandler<TMedia> {
  resolvedType: ResolvedType;
  detect(input: IngestInput): DetectResult | null;
  extract(ctx: ExtractContext): Promise<ExtractResult<TMedia>>;
  buildEnrichmentPrompt(ctx: EnrichContext<TMedia>): string;
}
```

### Mobile registry

```
apps/mobile/src/features/entry/
  constants.ts                        # card heights, aspects, animation ms
  types.ts                            # ContentTypeRenderer interface
  registry.ts                         # resolvedType → renderer
  components/
    FeedCardShell/                    # shared chrome (surface, source chip, menu)
    ProcessingCardShell/              # base shimmer + step label
    FailureCardShell/                 # base error + retry
  renderers/
    video-youtube/                    # one folder per resolvedType
      FeedCard/
        index.tsx
        index.styles.ts
      DetailView/
        index.tsx
        index.styles.ts
      ProcessingCard/index.tsx        # minimal — extends shell
      FailureCard/index.tsx           # minimal — extends shell
      renderer.ts                     # bundles the four into one export
      constants.ts                    # per-renderer dims, labels
```

**`ContentTypeRenderer`** interface:
```ts
interface ContentTypeRenderer<TMedia> {
  resolvedType: ResolvedType;
  FeedCard: ComponentType<FeedCardProps<TMedia>>;
  DetailView: ComponentType<DetailViewProps<TMedia>>;
  ProcessingCard: ComponentType<ProcessingCardProps>;
  FailureCard: ComponentType<FailureCardProps>;
}
```

### Adding a new content type = a folder + a line

```
1. Create apps/server/src/modules/ingest/handlers/<new-type>/
2. Create apps/mobile/src/features/entry/renderers/<new-type>/
3. Register both in their registry.ts
Done.
```

No changes to the pipeline runner, no changes to the feed list, no changes to the detail screen. The registry is the only integration point.

---

## Key design decisions

- **Registry pattern on both halves.** Zero code duplication across types. New type = drop-in folder + one line.
- **Pipeline as composable steps.** `detect → extract → enrich → classify → persist → finalize`. Each step is pure, typed, unit-testable. Type-specific logic lives **only** in `extract`.
- **Renderer as a quadruple.** Every type implements `{ FeedCard, DetailView, ProcessingCard, FailureCard }`. No generic fallback — each type looks like itself.
- **Every constant is a named export.** No magic numbers in JSX, styles, or server code. Co-located in `constants.ts`, imported by name.
- **No barrel files.** `renderer.ts` bundles exactly one renderer (not sibling re-exports); consumers import from concrete paths.
- **One `entries` table, one pipeline.** Polymorphism lives in `resolvedType` + typed `mediaMetadata` JSONB (discriminated union in shared types).
- **Every entry is fully enriched.** No "capture without AI" mode. User reviews the *result*, not the *need to process*.
- **Hybrid acceptance gate.** Agent computes `acceptanceScore` 0–1 on ingest; ≥ `ACCEPTANCE_SCORE_AUTO_KEEP` (constant) auto-sets `reviewStatus = 'kept'`. User overrides with a swipe.
- **Sources per-user.** Scoped `sources` table; agent dedups by domain before creating.
- **User notes are first-class.** Dedicated `userNote` markdown field, read by the wiki agent as an authorial signal.
- **Images save *everything* extractable.** Palette + colors + objects + OCR + motives + aesthetic labels — never block future features (moodboards, visual search) on missing signal.
- **YouTube is the reference slice.** First type delivered end-to-end; every subsequent type mirrors its folder structure exactly.

### Storage and entry assets

- **Persist paths, not public URLs** in the database for user-uploaded or pipeline-uploaded blobs: store the Supabase Storage **object path** (bucket-relative key), e.g. `cover_image_storage_key` on `entries`. Do not persist durable public bucket URLs in rows or in ingest telemetry.
- **Read-time URLs only:** APIs map storage keys to short-lived **signed** URLs at read time (server: `getSignedUrlForEntry` in `apps/server/src/lib/storage/entry-asset-url.ts` using the Storage signed-URL API). The public contract field remains `coverImageUrl` as a **client-loadable** string; legacy rows may still hold remote `https://` cover URLs from scraping until migrated.
- **Telemetry (`ingestRuns`, `agent_logs`):** record metadata, paths, ids, and costs — **not** embed long-lived public storage URLs in JSON payloads.

---

## Child tickets

### Phase 1 — Foundation

| ID | Ticket | Type |
|----|--------|------|
| [T-016a](./T-016a-schema-foundation.md) | Schema Foundation (resolvedType, sources, userNote, acceptanceScore, mediaMetadata, ingestRuns) | schema |
| [T-016b](./T-016b-server-pipeline-foundation.md) | Server Pipeline Foundation (handler interface, registry, runner, step modules) | feature (server) |
| [T-016c](./T-016c-mobile-renderer-foundation.md) | Mobile Renderer Foundation (renderer interface, registry, base shells) | feature (mobile) |
| [T-016d](./T-016d-capture-composer.md) | Capture Composer (type picker modal, registry-driven) | feature (mobile) |

### Phase 2 — Vertical slice (reference implementation)

| ID | Ticket | Type |
|----|--------|------|
| [T-016e](./T-016e-youtube-slice.md) | YouTube — handler + renderer + detail + failure states (end-to-end template) | feature (server + mobile) |

### Phase 3 — Replicate across types

| ID | Ticket | Type |
|----|--------|------|
| [T-016f](./T-016f-sources-service.md) | Sources Service + Auto-Detection + User Management | feature (server + mobile) |
| [T-016g](./T-016g-article-refactor.md) | Article Handler Refactor (wrap existing Jina pipeline in new pattern) | refactor (server + mobile) |
| [T-016h](./T-016h-social-slice.md) | Social — Reddit + LinkedIn handler + renderer | feature (server + mobile) |
| [T-016i](./T-016i-image-slice.md) | Image — Vision AI handler (palette, OCR, objects) + renderer | feature (server + mobile) |
| [T-016j](./T-016j-audio-slice.md) | Audio — Whisper handler + renderer | feature (server + mobile) |
| [T-016k](./T-016k-share-intent.md) | Share Intent (iOS Extension + Android Intent, quote/snippet/note detection) | feature (mobile native + server) |

### Phase 4 — Curation

| ID | Ticket | Type |
|----|--------|------|
| [T-016l](./T-016l-user-notes.md) | Per-Entry User Notes (obsidian-style markdown, wiki-readable) | feature (mobile + server) |
| [T-016m](./T-016m-wiki-acceptance-gate.md) | Wiki Acceptance Gate (acceptanceScore + kept filter + swipe action + review queue) | feature (server + mobile) |

### Dependency flow

```
Phase 1 — Foundation (sequential, blocks everything):
  T-016a (Schema)
    ├→ T-016b (Server Pipeline Foundation)
    └→ T-016c (Mobile Renderer Foundation)
         └→ T-016d (Capture Composer)

Phase 2 — Vertical slice:
  T-016b + T-016c └→ T-016e (YouTube)   ← reference impl

Phase 3 — Replicate (parallel after T-016e is merged):
  T-016e └→ T-016f (Sources)
         └→ T-016g (Article refactor into new pattern)
         └→ T-016h (Social)
         └→ T-016i (Image)
         └→ T-016j (Audio)
         └→ T-016k (Share Intent)

Phase 4 — Curation:
  T-016a └→ T-016l (User Notes)
  T-016a + T-015c └→ T-016m (Wiki Acceptance Gate — modifies Curator)
```

---

## Cross-cutting rules (applies to every child ticket)

- **No magic numbers.** Every number lives in a `constants.ts` — module-level or feature-level. JSX, styles, timeouts, limits, thresholds all imported by name.
- **No barrel `index.ts`.** `index.tsx` is an entry. `renderer.ts` / `handler.ts` / `registry.ts` are concrete modules. Consumers import from the exact path.
- **No `any`.** Handler + renderer interfaces are generic over their `TMedia`. Narrow with `resolvedType` discriminant.
- **`tv` in `index.styles.ts`.** Never inline. Every component has its styles file.
- **Tokens via `global.css` / `layout-imperative.ts`.** Component constants reference semantic CSS vars, not raw hex/pixels.
- **Zod at boundaries.** Handler `extract` output validated against a per-type Zod schema before persistence.
- **Trigger.dev for heavy jobs.** Vision AI and Whisper runs go through Trigger.dev tasks; fast pipelines (YouTube, article) can run inline but emit `ingestRuns` rows either way.

---

## References

- [T-015 Wiki Agent epic](../wiki-agent/T-015-wiki-agent-epic.md) — parent system
- [T-015r Compile Observability](../wiki-agent/T-015r-compile-observability.md) — telemetry pattern mirrored in `ingestRuns`
- `apps/server/src/modules/ai/pipelines/ingest.ts` — legacy pipeline (T-016g wraps it)
- `packages/db/src/schema/entries.ts` — schema T-016a extends
- `apps/mobile/src/features/entry/components/CaptureComposer/index.tsx` — legacy composer (T-016d replaces)
