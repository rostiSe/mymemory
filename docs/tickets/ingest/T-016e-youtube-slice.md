# T-016e: YouTube Vertical Slice (handler + renderer + detail + failure, end-to-end)

**Status:** pending
**Phase:** Vertical slice (reference implementation)
**Type:** feature (server + mobile)
**Epic:** [T-016 Ingest Strengthening](./T-016-ingest-strengthening-epic.md)
**Depends on:** [T-016a](./T-016a-schema-foundation.md), [T-016b](./T-016b-server-pipeline-foundation.md), [T-016c](./T-016c-mobile-renderer-foundation.md)

---

## Goal

Deliver YouTube end-to-end as the **reference implementation** every other content type copies. When this lands, a user can paste a YouTube URL into the existing composer and get:

- Detection: the URL is recognised as a YouTube video
- Extraction: full transcript + timestamps + chapters + channel + duration + thumbnail
- Enrichment: summary + key points + topics + tags via the shared pipeline
- Feed card: thumbnail-forward, duration pill, channel name, "▶︎ 12:34" playhead when shared with a timestamp
- Detail view: embedded player + transcript with timestamp scrubbing + chapter list + source attribution
- Processing state: "Fetching transcript…" then "Analysing…"
- Failure state: "Transcript unavailable" with retry, still saves title + thumbnail + channel

**Deliverable is the template.** The folder structure, interfaces used, constants discipline, and test patterns must be copy-paste-ready for T-016h (social), T-016i (image), T-016j (audio).

---

## Context

YouTube was chosen as the first slice because:
- Richest data shape of any type (thumbnail + duration + transcript + timestamps + chapters) — exercises the renderer interface fully
- Pure API work server-side — no heavy ML like Vision or Whisper, so we ship faster
- Explicitly the type the user wants first
- Failure modes are representative (no-transcript case mirrors future ML failure modes)

**Transcript source:** `youtube-transcript` npm package (or equivalent maintained fork) — no official YouTube API key required, works on the public caption track. **This is a new dependency — must confirm with user at implementation time per CLAUDE.md.** Fallback library: `youtubei.js` for metadata if oEmbed is insufficient.

**Metadata source:** YouTube oEmbed endpoint (`https://www.youtube.com/oembed?url=...&format=json`) — no key required, returns title/author/thumbnail. Duration + chapters come from `youtubei.js`.

**No player embedding dependency yet** — the DetailView uses `react-native-webview` with the YouTube IFrame player (zero cost, already a common pattern in Expo). Confirm at implementation time.

---

## Scope

### Server — `handlers/video-youtube/`

```
apps/server/src/modules/ingest/handlers/video-youtube/
  constants.ts
  detect.ts
  extract.ts
  extract-transcript.ts
  extract-metadata.ts
  extract-chapters.ts
  handler.ts
  prompts.ts
  register.ts           # calls registerHandler(youtubeHandler) at import
  types.ts              # narrow re-exports of VideoMediaMetadata pieces
  __tests__/
    detect.test.ts
    extract.test.ts
    handler.test.ts
```

**`constants.ts`** — every number lives here:
```ts
// URL patterns
export const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'] as const;
export const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

// API endpoints
export const YOUTUBE_OEMBED_URL = 'https://www.youtube.com/oembed';

// Timeouts
export const OEMBED_TIMEOUT_MS = 5_000;
export const TRANSCRIPT_TIMEOUT_MS = 15_000;
export const METADATA_TIMEOUT_MS = 10_000;

// Limits
export const TRANSCRIPT_MAX_CHARS = 200_000;      // cap for enrichment prompt upstream handles this; here we just guard
export const CHAPTERS_MAX = 50;
export const THUMBNAIL_PREFERRED_QUALITY = 'maxresdefault' as const;
export const THUMBNAIL_FALLBACK_QUALITY = 'hqdefault' as const;

// Detection confidence
export const DETECT_CONFIDENCE_EXACT = 1.0;       // host match + video id match
export const DETECT_CONFIDENCE_WEAK = 0.0;        // no match → null
```

**`detect.ts`** exports:
- `isYouTubeUrl(url: string): boolean`
- `parseYouTubeUrl(url: string): { videoId: string; timestampSec?: number } | null`
- `detect(input: IngestInput): DetectResult | null` — returns `{ resolvedType: 'video', confidence: DETECT_CONFIDENCE_EXACT }` when input is a URL parsed by `parseYouTubeUrl`; else null.

Parses timestamp from `?t=`, `&t=`, `#t=`, `youtu.be/...?t=` (raw seconds or `1h2m3s` format).

**`extract-metadata.ts`** — oEmbed call + enrichment via `youtubei.js` for duration/channel/publishedAt. Returns:
```ts
interface YouTubeMetadata {
  title: string;
  channelName: string;
  channelUrl?: string;
  thumbnailUrl: string;
  durationSec: number;
  publishedAt?: Date;
}
```

**`extract-transcript.ts`** — `youtube-transcript` call with timeout. Returns:
```ts
interface TranscriptSegment { textMd: string; startSec: number; durationSec: number; }
interface TranscriptResult { segments: TranscriptSegment[]; language: string; fullText: string; }
```

On failure returns `null` (no transcript available) — **not** an error. Handler continues with metadata-only extraction.

**`extract-chapters.ts`** — parses chapters from video description (YouTube convention: lines matching `/^(\d+:\d+(:\d+)?)\s+(.+)$/`). Returns `[]` if none.

**`extract.ts`** — orchestrates the three above in parallel, composes `VideoMediaMetadata`. Pseudocode:
```ts
export async function extract(ctx: ExtractContext): Promise<ExtractResult<VideoMediaMetadata>> {
  const parsed = parseYouTubeUrl(ctx.input.url);
  if (!parsed) throw new Error('invalid youtube url');

  const [metadata, transcript, chapters] = await Promise.all([
    extractMetadata(parsed.videoId),
    extractTranscript(parsed.videoId),  // may be null
    extractChapters(parsed.videoId),
  ]);

  return {
    readableContent: transcript?.fullText ?? metadata.title,  // transcript drives enrichment; fallback = title
    title: metadata.title,
    coverImageUrl: metadata.thumbnailUrl,
    wordCount: transcript ? countWords(transcript.fullText) : 0,
    language: transcript?.language,
    mediaMetadata: {
      kind: 'video',
      videoId: parsed.videoId,
      durationSec: metadata.durationSec,
      thumbnailUrl: metadata.thumbnailUrl,
      channelName: metadata.channelName,
      channelUrl: metadata.channelUrl,
      publishedAt: metadata.publishedAt,
      anchoredAtSec: parsed.timestampSec,
      transcript: transcript
        ? { language: transcript.language, segments: transcript.segments }
        : null,
      chapters,
    },
    sourceHint: {
      name: 'YouTube',
      domain: 'youtube.com',
      iconUrl: 'https://www.youtube.com/favicon.ico',
    },
  };
}
```

**`prompts.ts`** — overrides `buildEnrichmentPrompt` to tell the model it's analysing a video transcript:
```ts
export function buildEnrichmentPrompt(ctx: EnrichContext<VideoMediaMetadata>): string {
  return `
You are analysing the transcript of a YouTube video titled "${ctx.title}" on the channel "${ctx.mediaMetadata.channelName}". The video is ${formatDuration(ctx.mediaMetadata.durationSec)} long.

Focus on:
- What the speaker actually says (not just descriptions of visuals)
- Key arguments, claims, demonstrations, or conclusions
- Specific numbers, techniques, quotes worth remembering

If the transcript is auto-generated and garbled, say so in the summary.
`.trim();
}
```

**`handler.ts`** — composes detect + extract + prompt into the `ContentTypeHandler<VideoMediaMetadata>` interface.

**`register.ts`** — `registerHandler(youtubeHandler)`. Imported once by `apps/server/src/modules/ingest/handlers/register.ts` (bundle module that imports every handler's `register.ts` for side effects).

### Schema addition

Extend `VideoMediaMetadata` in `packages/shared/src/types/media-metadata.ts` (declared in T-016a) with the concrete shape:
```ts
export interface VideoMediaMetadata {
  kind: 'video';
  videoId: string;
  durationSec: number;
  thumbnailUrl: string;
  channelName: string;
  channelUrl?: string;
  publishedAt?: Date;
  anchoredAtSec?: number;            // from &t= param
  transcript: {
    language: string;
    segments: Array<{ textMd: string; startSec: number; durationSec: number; }>;
  } | null;
  chapters: Array<{ title: string; startSec: number; }>;
}
```

### Mobile — `renderers/video-youtube/`

```
apps/mobile/src/features/entry/renderers/video-youtube/
  constants.ts
  renderer.ts
  register.ts            # calls registerRenderer(youtubeRenderer) at import
  FeedCard/
    index.tsx
    index.styles.ts
  DetailView/
    index.tsx
    index.styles.ts
    TranscriptList/
      index.tsx
      index.styles.ts
    ChapterList/
      index.tsx
      index.styles.ts
    PlayerEmbed/
      index.tsx
      index.styles.ts
  ProcessingCard/
    index.tsx
    index.styles.ts
  FailureCard/
    index.tsx
    index.styles.ts
  __tests__/
    FeedCard.test.tsx
    DetailView.test.tsx
```

**`constants.ts`** (renderer-local):
```ts
export const FEED_CARD_THUMBNAIL_ASPECT = 16 / 9;
export const FEED_CARD_DURATION_PILL_RIGHT_PX = 8;
export const FEED_CARD_DURATION_PILL_BOTTOM_PX = 8;
export const FEED_CARD_CHANNEL_ICON_SIZE_PX = 18;
export const FEED_CARD_TITLE_MAX_LINES = 2;

export const DETAIL_PLAYER_HEIGHT_FRAC = 9 / 16;           // aspect within screen width
export const DETAIL_TRANSCRIPT_MIN_BATCH = 40;             // virtualisation batch
export const DETAIL_TRANSCRIPT_WINDOW_SIZE = 20;           // FlatList window
export const DETAIL_ACTIVE_SEGMENT_PADDING_PX = 4;
export const DETAIL_CHAPTER_MAX_VISIBLE_COLLAPSED = 6;

export const PROCESSING_STEP_LABELS = {
  fetchingTranscript: 'Fetching transcript…',
  analysing: 'Analysing video…',
  stalled: 'This is taking longer than usual',
} as const;

export const FAILURE_MESSAGES = {
  noTranscript: 'This video has no transcript. We saved the title, thumbnail, and channel.',
  extractionFailed: "Couldn't load this YouTube video. Tap retry.",
} as const;
```

**`FeedCard`** — type-specific body inside `<FeedCardShell>`:
- 16:9 cover with `coverImageUrl` via `expo-image`
- Duration pill bottom-right (mm:ss or h:mm:ss), `rounded-card` small
- Play icon overlay (centered, semi-transparent)
- If `anchoredAtSec` set: small "Starts at 12:34" chip instead of plain play icon
- Title (2 lines max, semibold)
- Channel name + favicon (18px)
- Source chip slot handled by shell

**`DetailView`** — composition:
1. `<PlayerEmbed videoId={...} startSec={anchoredAtSec}>` — `react-native-webview` hosting the YouTube IFrame player; height derived from screen width × `DETAIL_PLAYER_HEIGHT_FRAC`
2. Title + channel + published date
3. Summary + key points from enrichment
4. `<ChapterList>` — collapsible after `DETAIL_CHAPTER_MAX_VISIBLE_COLLAPSED`; tap chapter → `postMessage` to webview to seek
5. `<TranscriptList>` — virtualised `FlatList`; tap segment → seek; active segment highlighted via `postMessage` time polling (webview → RN)
6. Extracted palette/topics/tags as chips (existing feed primitives)
7. User note editor placeholder (T-016l)

**`ProcessingCard`** — extends `<ProcessingCardShell>`:
- Shows the YouTube thumbnail immediately (oEmbed returns in < 1s, runner can optimistically write it)
- Step label swaps between `PROCESSING_STEP_LABELS.fetchingTranscript` → `.analysing`
- After `PROCESSING_STALE_WARNING_MS` (from T-016c constants), shows `.stalled`

**`FailureCard`** — extends `<FailureCardShell>`:
- If error is "no transcript" → soft failure: still shows thumbnail + title + channel; `FAILURE_MESSAGES.noTranscript` below; `reviewStatus` auto-set to `'unreviewed'`; tap → opens a limited DetailView (player + metadata only, no transcript section)
- If error is generic → `FAILURE_MESSAGES.extractionFailed` + retry button

**`renderer.ts`** — composes the four components into a `ContentTypeRenderer<VideoMediaMetadata>`.

**`register.ts`** — `registerRenderer(youtubeRenderer)`. Added to `apps/mobile/src/features/entry/renderers/register.ts`.

### Activation

- Delete `_placeholder/` from both server and mobile (their job is done).
- Flip `INGEST_V2_ENABLED = true` and `RENDERER_REGISTRY_ENABLED = true` in dev.
- Saved articles (URLs not matching YouTube) fall through to the article placeholder — expected; T-016g wraps the existing Jina pipeline as the article handler next.
- Confirm the user wants to flip the flag for staging / prod at rollout time.

---

## Files

| File | Action |
|------|--------|
| `packages/shared/src/types/media-metadata.ts` | **Modify** — concretise `VideoMediaMetadata` shape |
| Server handler folder | **Create** — see module layout above |
| `apps/server/src/modules/ingest/handlers/register.ts` | **Create** — bundle import module; imports YouTube's `register.ts` |
| `apps/server/package.json` | **Modify** — add `youtube-transcript`, `youtubei.js` (**confirm with user**) |
| Mobile renderer folder | **Create** — see module layout above |
| `apps/mobile/src/features/entry/renderers/register.ts` | **Modify** — import YouTube's `register.ts` |
| `apps/mobile/package.json` | **Modify** — add `react-native-webview` if not present (**confirm with user**) |
| Delete `_placeholder/` server + mobile | **Delete** — after YouTube handler/renderer proven |

---

## Edge cases

- **No transcript available** (live streams, age-restricted, region-locked, transcript disabled) → soft failure, metadata-only entry, `readableContent = title`, enrichment still runs (degraded output). Feed card renders normally but `DetailView` shows no transcript section.
- **Short URLs (`youtu.be/...`)** → parse handles. `parseYouTubeUrl` returns the same shape.
- **Timestamp in URL** (`&t=120s`, `&t=2m30s`, `#t=150`) → parsed into `anchoredAtSec`; player starts there; FeedCard shows "Starts at…" chip.
- **Playlist URLs** (`list=...`) → for MVP, treat as single video (the `v=` parameter); log a warning. Full playlist support deferred.
- **Very long videos (> 4 hours)** → transcript can exceed `TRANSCRIPT_MAX_CHARS`; truncate at boundary (prefer chapter break if available) before enrichment. Store full transcript in `mediaMetadata.transcript` regardless.
- **Unlisted or private video** → oEmbed 401/404 → `ExtractionFailedError`; FailureCard with retry.
- **Age-restricted** → oEmbed may succeed but webview player refuses → player area shows "Age-restricted on YouTube" overlay with "Open in YouTube" link; transcript + metadata still visible.
- **Transcript in unexpected language** → `language` field stored; enrichment prompt passes it through — GPT-4o-mini handles multilingual fine.
- **Offline re-open** → DetailView's `PlayerEmbed` fails to load; shows thumbnail + "Connect to play"; transcript + metadata cached from server, fully readable offline.

---

## Definition of done

- [ ] All constants in `constants.ts` (handler + renderer). Grep gate passes on both directories.
- [ ] `detect.ts` exports `isYouTubeUrl`, `parseYouTubeUrl`, `detect`; unit tests cover all URL forms (watch, short, embed, mobile, with timestamp, with playlist, invalid).
- [ ] `extract.ts` parallelises metadata + transcript + chapters; handles partial failure (no-transcript case) gracefully.
- [ ] `VideoMediaMetadata` round-trips through Zod validation in `run-extraction`.
- [ ] `register.ts` on server runs `registerHandler(youtubeHandler)` at import; `handlers/register.ts` bundle imports YouTube.
- [ ] `register.ts` on mobile runs `registerRenderer(youtubeRenderer)` at import; `renderers/register.ts` bundle imports YouTube.
- [ ] FeedCard renders thumbnail + duration + title + channel; "Starts at" chip when `anchoredAtSec` set.
- [ ] DetailView renders player + summary + key points + chapters + transcript; transcript scrubbing seeks player (tap segment → webview `postMessage`).
- [ ] Active transcript segment highlighted as player progresses (webview → RN time events).
- [ ] ProcessingCard shows thumbnail optimistically + step label swap.
- [ ] FailureCard differentiates soft "no transcript" vs hard "extraction failed".
- [ ] `_placeholder/` deleted from both server and mobile.
- [ ] `INGEST_V2_ENABLED=true` + `RENDERER_REGISTRY_ENABLED=true` → saving a YouTube URL produces a correctly rendered entry within 10s; saving a non-YouTube URL still works (falls through to article placeholder with existing appearance).
- [ ] `ingestRuns` row for a YouTube ingest has: `resolvedType='video'`, populated tokens + cost, `stepsExecuted=['detect','extract','enrich','classify','persist']`.
- [ ] Accessibility: FeedCard has `accessibilityLabel` composing title + "YouTube video" + duration + channel; DetailView transcript segments labelled with timestamp.
- [ ] `pnpm -w run typecheck` clean; `pnpm -w run test` green for new tests.
- [ ] Dependencies added only after user confirmation (`youtube-transcript`, `youtubei.js`, `react-native-webview` if missing).
- [ ] Epic `T-016` links this ticket.

---

## Verification

1. Paste `https://www.youtube.com/watch?v=dQw4w9WgXcQ` into the existing composer. Within ~2s: ProcessingCard appears with thumbnail + "Fetching transcript…". Within ~10s: FeedCard appears enriched.
2. Tap → DetailView opens. Player plays. Transcript scrolls.
3. Tap a transcript segment → player seeks. Play → active segment highlights.
4. Tap a chapter → player seeks to chapter start.
5. Paste `https://youtu.be/dQw4w9WgXcQ?t=43` → FeedCard shows "Starts at 0:43" chip; DetailView player starts at 0:43.
6. Paste a video with transcripts disabled → ProcessingCard fails over to soft-failure FailureCard; tap → limited DetailView renders (no transcript section).
7. Paste an age-restricted or private URL → hard-failure FailureCard with retry.
8. Flip `INGEST_V2_ENABLED=false` → saving any URL uses legacy pipeline (regression safety).
9. Add a dummy `renderers/video-tiktok/` folder, register it, set a test entry's `resolvedType='video'` but with a custom `mediaMetadata.kind='video-tiktok'` — **wait, this is a lesson:** both handlers claim `resolvedType='video'`. We resolve by letting detect return confidence; update `video-youtube` detect to return confidence only for YouTube hosts, and future `video-tiktok` returns for TikTok hosts. `resolvedType='video'` is the umbrella; `mediaMetadata.kind` discriminates. This is a design confirmation step in this ticket — document it in the epic's "Adding a new video platform" note.
10. Grep: `rg '\b[0-9]{2,}\b' apps/server/src/modules/ingest/handlers/video-youtube apps/mobile/src/features/entry/renderers/video-youtube --glob '!*.test.*' --glob '!*constants*'` returns no hits.

---

## Ticket sequence

This is the template. After merge, every other content type ticket (T-016g article refactor, T-016h social, T-016i image, T-016j audio) is a mechanical copy of this structure. Reviewers of those tickets check folder shape + interface adherence + constants discipline against this reference.
