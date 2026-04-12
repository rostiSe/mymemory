# T-011e: Research — space suggestion algorithm

**Status:** planned  
**Type:** research (no implementation in this ticket)  
**Risk:** n/a | **Effort:** medium  
**Epic:** [T-011 Spaces](./T-011-spaces-screen.md)  
**Depends on:** [T-011a](./T-011a-spaces-server-scaffold.md) (understand current pipeline)

---

## Goal

Document options and **recommend** an approach for smarter space suggestions / future auto-assignment. **Deliverable is a doc**, not production code.

---

## Investigate

1. **Topic/tag overlap** — set intersection; pros/cons  
2. **Embedding clusters** — k-means / DBSCAN / HDBSCAN; pros/cons  
3. **LLM judge** — pairwise entry vs space; pros/cons  
4. **Hybrids** — pre-filter + judge, embedding + topic confirmation  
5. **Comparable products** — Notion AI, Readwise/Reader, Raindrop, Photos smart albums (patterns only)

---

## Deliverable

**`docs/SPACES-ALGORITHM.md`** must include:

- Comparison table (accuracy, cost, latency, explainability)  
- **Recommended** approach + rationale  
- Schema / API implications  
- Edge cases: 0 spaces, 1 space, many spaces, entry fits multiple spaces  

---

## Definition of done

- [ ] `docs/SPACES-ALGORITHM.md` merged with the above sections
- [ ] Links from epic updated if filename differs

---

## Next

- [T-011f](./T-011f-spaces-smart-suggestions.md) implements the chosen direction