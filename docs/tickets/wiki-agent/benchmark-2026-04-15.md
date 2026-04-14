# Wiki Agent Smoke Test Benchmark — 2026-04-15

## Environment

- Model: gpt-4o-mini
- User: 78 entries total, 59 with processedStatus=done
- Step limits: Curator 25, Writer 10, Linter 10
- Mode: full compile

## Compile Results


| Metric                  | Value        |
| ----------------------- | ------------ |
| Total tokens            | 74,767       |
| Estimated cost          | ~$0.04       |
| Curator initial steps   | 25 (hit max) |
| Curator initial tokens  | 21,672       |
| Curator finalize steps  | 7            |
| Curator finalize tokens | 3,598        |
| Writer runs             | 14 spaces    |
| Writer avg steps        | 5.1          |
| Writer avg tokens       | 3,393        |
| Pages created           | 20           |
| Pages updated           | 8            |
| Versions created        | 27           |


## Writer Breakdown


| Space                  | Created | Updated | Versions | Steps | Tokens |
| ---------------------- | ------- | ------- | -------- | ----- | ------ |
| AI Tools               | 0       | 1       | 1        | 4     | 4,098  |
| Art and Culture        | 2       | 0       | 2        | 4     | 2,947  |
| AI Optimization        | 1       | 0       | 0        | 4     | 3,930  |
| Cultural Art History   | 1       | 0       | 0        | 4     | 2,593  |
| Content Creation       | 4       | 1       | 7        | 5     | 4,856  |
| Documentation          | 0       | 1       | 1        | 4     | 2,143  |
| Event Management       | 0       | 1       | 1        | 4     | 2,177  |
| Large Language Models  | 0       | 1       | 1        | 4     | 2,632  |
| Cultural Events        | 1       | 0       | 1        | 6     | 4,485  |
| Pending Review         | 2       | 1       | 2        | 8     | 3,439  |
| Software Development   | 0       | 1       | 1        | 3     | 3,197  |
| User Experience Design | 2       | 1       | 3        | 5     | 3,800  |
| Street Food Festivals  | 3       | 0       | 3        | 8     | 4,766  |
| Utility                | 4       | 0       | 4        | 8     | 4,434  |


## Lint Results


| Metric       | Value                        |
| ------------ | ---------------------------- |
| Issues found | 9 (all empty_space warnings) |
| Steps        | 3                            |
| Tokens       | 3,141                        |


## Fixes Applied During T-015e

1. **topicFilter sentinel** — Added `/`, `none`, `null`, `undefined`, `n/a` to normalizeTopicFilter deny list in wiki-tools.ts
2. **Curator prompt** — Rewrote listEntries rules with concrete examples, added efficiency rules (batch assignments, no duplicate calls)
3. **Step limits** — Curator: 10 -> 25, Writer: 5 -> 10
4. **Debug script** — Created scripts/debug-agent-logs.ts

## Known Issues (deferred)

- Curator's final JSON summary doesn't match actual actions (hits maxSteps before generating summary). DB state is correct; only the CompileResult metadata is inaccurate.
- Some page-to-page links use hallucinated pageIds (model invents UUIDs)
- Incremental compile not yet validated
- Some page/space name mismatches (e.g. "Claude Code Agent" in "User Experience Design")

