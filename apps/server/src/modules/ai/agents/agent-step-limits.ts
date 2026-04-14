/**
 * `generateText` multi-step loop (AI SDK): one `doGenerate` plus any
 * tool execution for that turn. `stopWhen: stepCountIs(n)` stops when
 * `steps.length === n`, capping how many turns run if the model keeps requesting tools.
 *
 * Default SDK behavior is `stepCountIs(1)`, which exits after the first turn and
 * never runs a follow-up model call with tool results — too low for these agents.
 */

export const CURATOR_MAX_STEPS = 10;
export const WRITER_MAX_STEPS = 5;
