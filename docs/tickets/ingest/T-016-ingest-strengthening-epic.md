# T-016: Ingest Strengthening (epic)

**Status:** in-progress
**Phase:** 5 — Ingest
**Type:** epic (schema + server + mobile)
**Depends on:** T-015 Wiki Agent foundation (shared AI module, oRPC pattern)

---

## Goal

Transform MyMemory's ingest pipeline from a URL-only tool into a general-purpose capture engine that handles **every natural way a human saves a thought**: links, videos, social posts, images, voice memos, and shared text — each routed to a specialised extraction pipeline but producing a **consistent enrichment output** (summary, keyPoints, topics, tags, embedding) that every downstream system (wiki, spaces, feed) consumes uniformly.

This epic also introduces two cross-cutting concerns that make the feed itself richer:
- **Sources as first-class entities** (Medium, Substack, Reddit, …) — auto-detected, user-nameable, per-user scoped
- **Wiki acceptance gate** — only entries explicitly flagged `kept` feed the Curator, so the wiki stops being noisy

---

## Conceptual model

```
Primitive capture surfaces (how the user inputs)
    │
    ├─ URL    (typed / pasted / share intent)
    │   └─ resolves to: article | video | social | product
    │
    ├─ File   (camera or Files app)
    │   └─ resolves to: image   [Vision AI: OCR, palette, colors, objects, motives]
    │
    ├─ Text   (share intent → paste buffer)
    │   └─ resolves to: quote | snippet | note   [LLM-detected subtype]
    │
    └─ Audio  (voice memo)
        └─ resolves to: voice-memo   [Whisper → GPT]

Every resolved type produces the same enrichment output shape:
  { summary, keyPoints, topics[], tags[], embedding, acceptanceScore, sourceId? }
```

**Three layers:**
- **`entryType`** (`url` | `file` | `text` | `audio`) — how the user *captured* it
- **`resolvedType`** (`article` | `video` | `social` | `product` | `image` | `voice-memo` | `quote` | `snippet` | `note`) — what the system *extracted*
- **`sourceId`** (FK to `sources`) — who published it (Medium, Reddit, Self)

---

## Key design decisions

- **One `entries` table, one pipeline.** No per-type forks at the schema level — polymorphism lives in `resolvedType` + type-specific JSONB blobs (e.g. `mediaMetadata`, `transcriptData`).
- **Every entry is fully enriched.** No "quick capture without AI" mode — AI always runs in the background. User reviews the *result*, not the *need to process*.
- **Hybrid acceptance gate.** Agent computes `acceptanceScore` 0–1 on ingest; ≥ 0.7 auto-sets `reviewStatus = 'kept'`. User can override with a swipe. Wiki compiler (T-015c) is taught to filter by `kept` only.
- **Sources are per-user.** A `sources` table scoped by `userId` so "My team's wiki" stays private. Agent dedups by domain before creating; user can rename. Mirrors `spaces.origin` pattern.
- **User notes are first-class, not metadata.** A dedicated `userNote` markdown field on every entry, read by the wiki agent as an authorial signal.
- **Images save *everything* extractable.** Palette, dominant colors, detected objects, OCR text, visual description, aesthetic labels — future features (moodboards, visual search) should never be blocked by missing signal.
- **YouTube is first-class video.** Full transcript + timestamps + chapters stored; timestamp-anchored save supported when the share URL contains one.
- **Share intent is the primary capture path.** The in-app composer exists for completeness; the share sheet is how most saves happen.
- **Vision AI + Whisper are heavy.** Queue + retry are non-negotiable — reuse Trigger.dev from T-015c.

---

## Child tickets

### Foundation phase

| ID | Ticket | Type | Phase |
|----|--------|------|-------|
| [T-016a](./T-016a-schema-foundation.md) | Schema Foundation (resolvedType, sources, userNote, acceptanceScore, mediaMetadata) | schema | Foundation |
| [T-016b](./T-016b-sources-service.md) | Sources Service + Auto-Detection + User Management | feature (server + mobile) | Foundation |
| [T-016c](./T-016c-capture-composer-redesign.md) | Capture Composer Redesign (type picker modal) | feature (mobile) | Foundation |

### Content-type pipelines

| ID | Ticket | Type | Phase |
|----|--------|------|-------|
| [T-016d](./T-016d-youtube-ingest.md) | YouTube / Video URL Ingest (transcript + timestamps + chapters) | feature (server) | Pipelines |
| [T-016e](./T-016e-social-ingest.md) | Social URL Ingest (Reddit + LinkedIn extraction) | feature (server) | Pipelines |
| [T-016f](./T-016f-image-ingest.md) | Image File Ingest (Vision AI: OCR, palette, objects, motives) | feature (server + mobile) | Pipelines |
| [T-016g](./T-016g-audio-ingest.md) | Audio / Voice Memo Ingest (Whisper → enrichment) | feature (server + mobile) | Pipelines |
| [T-016h](./T-016h-share-intent-ingest.md) | Text Share Intent (iOS Share Extension + Android Intent, quote/snippet/note detection) | feature (server + mobile + native) | Pipelines |

### Curation layer

| ID | Ticket | Type | Phase |
|----|--------|------|-------|
| [T-016i](./T-016i-user-notes.md) | Per-Entry User Notes (obsidian-style markdown, wiki-readable) | feature (mobile + server) | Curation |
| [T-016j](./T-016j-wiki-acceptance-gate.md) | Wiki Acceptance Gate (acceptanceScore + kept filter + swipe action) | feature (server + mobile) | Curation |

### Dependency flow

```
Foundation:
  T-016a (Schema)
    ├→ T-016b (Sources Service)
    └→ T-016c (Capture Composer)

Pipelines (parallel after T-016a + T-016c):
  T-016a └→ T-016d (YouTube)
  T-016a └→ T-016e (Social)
  T-016a + T-016c └→ T-016f (Image)
  T-016a + T-016c └→ T-016g (Audio)
  T-016a └→ T-016h (Share Intent)

Curation:
  T-016a └→ T-016i (User Notes)
  T-016a └→ T-016j (Wiki Acceptance Gate)  ←── modifies T-015c orchestrator
```

---

## Cross-cutting notes

- **Reuses T-015 infrastructure**: Trigger.dev task pattern, oRPC router layout, `agent_logs`, observability tables (T-015r when it lands).
- **Storage**: images + audio go to Supabase Storage; entry row stores the public URL + extraction metadata.
- **Cost**: Vision AI and Whisper are material — budget line in T-015r's `compile_runs` equivalent (ingest runs will need their own telemetry table, defined in T-016a).
- **Out of scope for this epic**: PDF / document ingest, video file upload, scientific paper special-casing, composite entries (one entry = one primitive), follow-a-source (auto-pull), YouTube beyond YouTube (Vimeo / Twitch).

---

## References

- [T-015 Wiki Agent epic](../wiki-agent/T-015-wiki-agent-epic.md) — parent system this feeds
- `apps/server/src/modules/ai/pipelines/ingest.ts` — current pipeline
- `packages/db/src/schema/entries.ts` — current schema
- `apps/mobile/src/features/entry/components/CaptureComposer/index.tsx` — current composer
