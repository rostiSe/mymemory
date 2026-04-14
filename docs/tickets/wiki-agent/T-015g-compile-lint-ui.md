# T-015g: Mobile — Compile + Lint UI

**Status:** done
**Phase:** Mobile
**Type:** feature (mobile)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-015f (wiki page rendering complete)

---

## Goal

Give users a way to trigger wiki compilation and linting from within the app, monitor compilation progress in real-time, and review lint results. This is the operational control surface for the wiki agent — the "Run" and "Health-check" buttons.

---

## Context

### Server endpoints (already wired via T-015d)

| Endpoint | Behavior | Response |
|----------|----------|----------|
| `wiki.compile({ mode })` | Runs orchestrator synchronously. Sets `compilationStatus = compiling` → runs Curator → Writers → finalize → sets `idle` or `failed`. Returns `CompileResult`. | `{ runId, mode, totalTokens, error?, curatorInitial, writers[], curatorFinalize }` |
| `wiki.lint()` | Runs Linter agent synchronously. Returns flagged issues. | `{ runId, issues[], totalTokens }` |
| `wiki.status()` | Reads `compilationStatus` and `lastCompiledAt` from index space. | `{ status: "idle" | "compiling" | "failed", lastCompiledAt }` |
| `wiki.logs({ runId?, limit? })` | Returns agent action logs for a run. | `AgentLog[]` |

**Key behavior:** `compile` is **synchronous on the server** — the HTTP request stays open while Curator → Writers → finalize run (typically 30–90 seconds for ~50 entries). The client mutation will be pending for that entire duration. In the future this may move to Trigger.dev tasks with async polling, but for MVP the mutation blocks.

### Existing hooks from T-015f

- `useCompilationStatus()` — polls `wiki.status`, already used in `SpaceDetailScreen`
- `useWikiPages(spaceId?)` — wiki page listing, needs invalidation after compile

### Existing patterns

- `useAppToast()` for success/error/warning/info toasts
- `useMutation` with `onSuccess` / `onError` for all mutations (see `useCreateSpace`, `useEntryMutations`)
- `ListGroup` from HeroUI for settings-style grouped rows
- `Dialog` from HeroUI for confirmations
- `Button` variants: `primary`, `secondary`, `ghost`, `danger`
- `Chip` for status badges
- `Spinner` from HeroUI for inline loading

### Where should it live?

The compile/lint controls are wiki-level operations, not space-specific. Two placement options:

1. **SpacesScreen header** — a "Compile Wiki" button above the spaces list (closest to where the user manages their knowledge organization)
2. **Settings** — under a "Wiki" section (keeps SpacesScreen focused on space management)

**Decision:** Add to **SpacesScreen** as a compact status card above the space list. This is where the user thinks about their knowledge structure, and "Compile" is the natural next step after seeing spaces. A secondary "Wiki Health" link in Settings for lint.

---

## File structure

```
apps/mobile/src/
  features/wiki/
    hooks/
      useWikiMutations.ts             # useMutation hooks: compile, lint
    components/
      CompileStatusCard/
        index.tsx                     # Compile trigger + live status display
        index.styles.ts               # tv() for status variants
      LintResultsSheet/
        index.tsx                     # Bottom sheet / modal showing lint issues
      AgentLogViewer/
        index.tsx                     # Scrollable list of agent logs for a run
```

---

## Scope

### 1. Mutation hooks (`features/wiki/hooks/useWikiMutations.ts`)

```typescript
function useCompileWiki()
// → useMutation calling orpcClient.wiki.compile({ mode })
// onSuccess: invalidate wiki.listPages, wiki.status, wiki.getPage queries
// onSuccess: show toast with summary (pages created/updated, token cost)
// onError: show error toast

function useLintWiki()
// → useMutation calling orpcClient.wiki.lint()
// onSuccess: return issues to caller (no cache mutation needed — lint is read-only)
// onError: show error toast
```

Invalidation strategy on successful compile:
- `queryClient.invalidateQueries({ queryKey: orpc.wiki.listPages.queryKey(...) })`
- `queryClient.invalidateQueries({ queryKey: orpc.wiki.status.queryKey(...) })`
- `queryClient.invalidateQueries({ queryKey: orpc.wiki.getPage.queryKey(...) })`
- `queryClient.invalidateQueries({ queryKey: orpc.wiki.getPageVersions.queryKey(...) })`
- `queryClient.invalidateQueries({ queryKey: orpc.spaces.list.queryKey(...) })`

This ensures all wiki screens pick up the new data when the user navigates back.

### 2. CompileStatusCard (`features/wiki/components/CompileStatusCard/`)

A self-contained card that shows wiki compilation state and provides action buttons. Placed in `SpacesScreen` header above the space list.

#### States (via `tv()` in `index.styles.ts`)

| State | Appearance | Actions |
|-------|-----------|---------|
| **idle** (never compiled) | Neutral card. "Your wiki hasn't been compiled yet." | "Compile Wiki" primary button |
| **idle** (previously compiled) | Success-tinted card. "Last compiled: {date}" | "Recompile" secondary button, "Incremental" ghost button |
| **compiling** | Accent-tinted card with `Spinner`. "Compiling your wiki…" | Disabled buttons, elapsed time counter |
| **failed** | Danger-tinted card. "Compilation failed." | "Retry" primary button |
| **compile result** (just finished) | Success card with summary. "Created 5 pages, updated 3." | "View Wiki" link, token cost in muted text |

#### Implementation details

- Uses `useCompilationStatus()` for current status
- Uses `useCompileWiki()` mutation for triggering
- When mutation is pending (`isPending`), show compiling state regardless of server status (optimistic)
- Elapsed time counter: track `Date.now()` on mutation start with `useRef`, update display via `setInterval` every second
- On mutation success, flash the compile result summary for 8 seconds, then fade to idle state
- "Compile Wiki" defaults to `mode: "full"` for first run (no `lastCompiledAt`), shows choice on subsequent runs
- "Health Check" button triggers lint (see lint section below)

#### Compile mode selection

When `lastCompiledAt` exists, show two buttons:
- **"Full Recompile"** — `mode: "full"`, rebuilds everything
- **"Update Wiki"** — `mode: "incremental"`, only processes new entries

Use `Dialog` confirmation for full recompile: "This will rebuild all wiki pages from scratch. Existing pages will be updated, not deleted. Continue?"

### 3. LintResultsSheet (`features/wiki/components/LintResultsSheet/`)

Shows lint results in a bottom sheet or modal after the user triggers "Health Check".

#### Layout

- **Header**: "Wiki Health Check" + issue count badge + total tokens used
- **Issue list**: `FlatList` of lint issues, each rendered as a card:
  - Severity icon: `info` (muted), `warn` (warning), `error` (danger)
  - Category as `Chip` (e.g., "orphan_entry", "thin_page", "missing_links")
  - Message text
  - Suggested fix (if present) in muted italic text
- **Empty state**: "No issues found. Your wiki is healthy!" with checkmark icon
- **Footer**: "Run at {timestamp}" + "Close" button

#### Trigger

- "Health Check" button on `CompileStatusCard` (secondary/ghost variant)
- Opens the sheet, calls `useLintWiki()` mutation
- Shows spinner while lint is running
- Populates results on success

### 4. AgentLogViewer (`features/wiki/components/AgentLogViewer/`)

Optional expandable section showing what the agent did during a compile or lint run.

#### Layout

- Presented as a collapsible section within the compile result summary (uses `AnimatedExpandSection` from T-015f)
- **Log list**: each entry shows:
  - Timestamp (HH:MM:SS)
  - Level badge: `info` (muted), `warn` (warning), `error` (danger), `action` (accent)
  - Message text
  - Tool name as `Chip` if present (e.g., "createOrUpdateSpace", "assignEntriesToSpace")
- **Filter**: simple toggle chips for level filtering (info / warn / error / action)
- Max 100 logs displayed, with "Load more" button

#### Data

- Query `wiki.logs({ runId })` when the user expands the section
- Only fetch when expanded (lazy loading via `enabled` flag on the query)

### 5. SpacesScreen integration

Add `CompileStatusCard` to the `SpacesScreen` `ListHeaderComponent`:

```
[CompileStatusCard]              ← NEW: compile/lint controls
[hint text + "New space" button]
[SpaceSuggestionsInbox]
[space list]
```

The card goes at the very top of the header, before the existing content.

### 6. Settings integration (optional, lightweight)

Add a "Wiki" section to `SettingsScreen` under "Appearance" and above "Account":

```
Wiki
  ├ Compilation Status    →  idle / compiling / failed
  ├ Last Compiled         →  Apr 15, 2026, 3:24 PM
  └ Health Check          →  [triggers lint, shows result toast]
```

Uses `ListGroup` matching existing settings pattern. Health Check row triggers `useLintWiki()` inline, shows result count in a toast: "Health check complete: 3 issues found" or "No issues — wiki is healthy."

### 7. Polling during compilation

When `compilationStatus === "compiling"` (from server or from local mutation state):
- `useCompilationStatus()` should refetch on a short interval (every 3 seconds) so the UI stays in sync if the user navigates away and returns
- When status transitions from `"compiling"` to `"idle"` or `"failed"`, stop polling and invalidate wiki queries

Add `refetchInterval` to `useCompilationStatus`:
```typescript
function useCompilationStatus() {
  const query = useQuery({
    ...orpc.wiki.status.queryOptions({ input: undefined }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "compiling" ? 3000 : false;
    },
  });
  return query;
}
```

### 8. Compile result summary format

When a compile succeeds, display a human-friendly summary extracted from `CompileResult`:

```
✓ Wiki compiled successfully

Created: 5 pages · Updated: 3 pages
Spaces processed: 4
Tokens used: ~12,400 (~$0.01)

[View Agent Log]  [Browse Wiki]
```

Token cost estimate: `totalTokens * (0.15 / 1_000_000)` for gpt-4o-mini input (rough estimate, displayed as `~$X.XX`).

---

## Design tokens

Add to `global.css` `@theme inline`:

```css
/* Compile status card */
--spacing-compile-card-padding: 16px;
```

No new `layout-imperative.ts` entries needed — card uses standard `px-card py-card` spacing.

---

## UX flow

```
SpacesScreen
  └─ CompileStatusCard (always visible at top of list header)
       ├─ [idle, never compiled] → "Compile Wiki" button
       │    └─ tap → mutation fires, card enters compiling state
       │         └─ spinner + elapsed timer for 30-90s
       │              └─ success → summary flash (8s) → idle with lastCompiledAt
       │              └─ error → failed state + error message + "Retry"
       │
       ├─ [idle, previously compiled] → "Update Wiki" + "Full Recompile" buttons
       │    └─ "Update Wiki" → incremental compile (same flow as above)
       │    └─ "Full Recompile" → confirm dialog → full compile
       │
       ├─ [compiling] → spinner + "Compiling your wiki…" + elapsed time
       │    └─ auto-detected via status polling if user returns
       │
       └─ "Health Check" button (always visible)
            └─ tap → LintResultsSheet opens
                 └─ spinner while lint runs (5-15s)
                 └─ issue list or "healthy" message
```

---

## DoD (Definition of Done)

- [x] `useCompileWiki()` mutation triggers `wiki.compile`, invalidates wiki queries on success
- [x] `useLintWiki()` mutation triggers `wiki.lint`, returns issues
- [x] `CompileStatusCard` renders all 4 states: idle (new), idle (compiled), compiling, failed
- [x] Compile result summary shows pages created/updated, tokens, and cost estimate
- [x] Full vs incremental compile mode selection with confirm dialog for full recompile
- [x] `LintResultsSheet` displays lint issues with severity, category, message, and suggested fix
- [x] Empty lint state shows "wiki is healthy" message
- [x] `AgentLogViewer` shows agent logs for a compile run with level filtering
- [x] `CompileStatusCard` is integrated into `SpacesScreen` list header
- [x] `useCompilationStatus()` polls every 3s while compiling, stops when idle/failed
- [x] Elapsed time counter updates every second during compilation
- [x] Toast notifications on compile success, compile error, and lint completion
- [x] Wiki queries invalidated after successful compile so pages/spaces refresh
- [x] Settings screen has "Wiki" section with status and health check
- [x] No `any` types, `tv()` variants in `index.styles.ts`
- [x] `pnpm typecheck` passes

---

## Out of scope (deferred)

- Trigger.dev async compilation with real-time streaming updates
- Compile scheduling (cron) or auto-compile on entry ingest
- Per-space selective compilation (compile only one space)
- Compile history / past run comparison
- Properties editor (T-015h)
