# T-011: Spaces (epic)

**Status:** planned (phased)
**Phase:** 4 — Spaces + Wiki Agent
**Type:** epic (server module + agent + pipeline + mobile)

---

## Overview

Spaces is the organizational + knowledge compilation layer of mymemory. The long-term vision: an **agent-driven wiki** (Karpathy LLM Wiki pattern) where spaces are living knowledge nodes — not just folders, but compiled artifacts that the agent builds, maintains, and interconnects.

### Vision

> Entries are **raw sources** (immutable after ingest). Spaces are **compiled wiki nodes** — the agent reads entries, synthesizes knowledge, adds cross-references, flags contradictions, and maintains a living overview. The system provides a **template with defaults**, the agent **extends it with custom properties** (JSONB) based on what the content needs. Both the user and the agent can create spaces, assign entries, and modify properties.

### Key decisions

- **Agent-driven, not schema-driven** — spaces have a typed skeleton (name, description, wiki content) + JSONB `properties` for agent/user-defined extensions (like Notion databases)
- **Prototype the agent first** — before building full UI, run the agent against real data to see what properties it naturally creates, what wiki content looks like, what cross-refs emerge
- **Research agent architecture** — investigate modern patterns (file-based memory, agent frameworks, Trigger.dev, Claude SDK) before committing
- **Hybrid runtime** — light updates during ingest (file entry, update cross-refs) + periodic compilation (synthesis, contradictions, log)
- **Auto-assign disabled** during transition — pipeline creates suggestions only, never auto-links
- **Flat list V1** — hierarchy comes naturally as the agent interconnects spaces

### Wiki content per space

- **Synthesis / overview** — compiled summary of everything in the space ("state of knowledge")
- **Key insights + contradictions** — extracted insights across entries, flagged disagreements
- **Cross-references** — links to related spaces with explanation
- **Chronological log** — timeline of additions and changes

---

## Child tickets

| ID | Ticket | Type | File |
|----|--------|------|------|
| T-011a | Scaffold spaces server module + disable auto-assign | refactor | [T-011a](./T-011a-spaces-server-scaffold.md) |
| T-011b | Space suggestion + management API | feature (server) | [T-011b](./T-011b-spaces-management-api.md) |
| T-011c | Spaces screen + suggestion review (mobile) | feature (mobile) | [T-011c](./T-011c-spaces-screen-mobile.md) |
| T-011d | Space detail + entry assignment UI (mobile) | feature (mobile) | [T-011d](./T-011d-space-detail-assignment-mobile.md) |
| T-011e | Research — space suggestion algorithm | research | [T-011e](./T-011e-spaces-algorithm-research.md) |
| T-012 | **Research — wiki agent architecture** | **research** | [T-012](./T-012-wiki-agent-research.md) |
| T-012a | Agent prototype — compile spaces from real data | prototype | TBD after T-012 |
| T-012b | Schema: wiki content + JSONB properties + cross-refs | schema | TBD after T-012a |
| T-012c | Agent runtime (background jobs / scheduling) | infra | TBD after T-012 |
| T-012d | Mobile: wiki content rendering + property display | feature (mobile) | TBD after T-012b |

---

## Recommended order

### Phase A: Foundation (basic spaces work as folders)

| Order | Ticket | Why |
|-------|--------|-----|
| 1 | **T-011a** | Unblocks everything; removes centroid auto-assign; creates `modules/spaces/` |
| 2 | **T-011b** | Mobile needs APIs for suggestions + management |
| 3 | **T-011c** | Core Spaces UI — list, suggestions, create |
| 4 | **T-011d** | Space detail + entry assignment flows |

### Phase B: Research (runs in parallel with Phase A)

| Order | Ticket | Why |
|-------|--------|-----|
| 2-3 | **T-011e** | Suggestion algorithm research — can overlap with mobile tickets |
| 2-3 | **T-012** | Wiki agent architecture research — investigate patterns before building |

### Phase C: Agent Sprint (after Phase A + B complete)

| Order | Ticket | Why |
|-------|--------|-----|
| 5 | **T-012a** | Prototype agent against real data — see what it creates |
| 6 | **T-012b** | Schema based on prototype findings |
| 7 | **T-012c** | Production runtime for the agent |
| 8 | **T-012d** | Mobile rendering of wiki content |

**Why this order:** Phase A gives you working spaces immediately. Phase B researches in parallel so no time is wasted. Phase C builds the agent on top of real infrastructure and real research — no guessing, no refactoring. The prototype runs against real entries in the DB, so you see actual results before committing to a schema.

---

## Future (out of epic scope)

- Space hierarchy / subspaces (agent may create these naturally)
- Space icons, colors, cover images
- Notification system for new suggestions
- Bulk suggestion approval
- Space merging
- Space sharing between users
- Lint/health-check pass (Karpathy's "lint" operation)
- Query interface (ask questions against the wiki)
