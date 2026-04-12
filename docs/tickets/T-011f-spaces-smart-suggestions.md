# T-011f: Implement smart space suggestions

**Status:** planned  
**Type:** feature (server + optional pipeline)  
**Risk:** TBD | **Effort:** TBD  
**Epic:** [T-011 Spaces](./T-011-spaces-screen.md)  
**Depends on:** [T-011e](./T-011e-spaces-algorithm-research.md)

---

## Goal

Implement the **recommended algorithm** from `docs/SPACES-ALGORITHM.md`: improve suggestion quality and/or (if product approves) selective auto-linking. **Scope, safety, and rollout are clarified in a dedicated session after T-011e.**

---

## Inputs

- Findings in `docs/SPACES-ALGORITHM.md`
- Existing `spaceSuggestions` + manual flows from T-011a–T-011d

---

## Definition of done

- [ ] Written acceptance criteria copied from T-011e recommendation + product sign-off  
- [ ] Implementation + tests / typecheck per agreed scope  
- [ ] No regression: manual assign/reject/approve still work  

---

## Note

Do **not** start this ticket until T-011e deliverable exists and priorities are agreed.
