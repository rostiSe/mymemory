/**
 * Central catalog of AI prompt builders. Used by tools under `tools/`.
 * Dynamic parts are passed as typed arguments; truncation for long markdown lives here.
 */

/** Max characters of markdown included in tag/topic prompts (increase when switching to readable content). */
export const MAX_CONTENT_CHARS = 4000;

/** System prompt for `summarizeText` in `tools/summarize.ts`. */
export function summarizeSystemPrompt(): string {
  return 'You are a helpful assistant that concisely summarizes text.';
}

/** User prompt for `summarizeText` — full text to summarize. */
export function summarizeUserPrompt(text: string): string {
  return `Summarize the following text:\n\n${text}`;
}

/** System prompt for `generateTags` in `tools/generate-tags.ts`. */
export function generateTagsSystemPrompt(): string {
  return 'You are an expert content categorizer. Given the content and its summary, generate a concise list of relevant tags.';
}

export type GenerateTagsUserPromptOpts = {
  markdown: string;
  summary: string;
  existingTags: string[];
};

/** User prompt for `generateTags` — truncates markdown to {@link MAX_CONTENT_CHARS}. */
export function generateTagsUserPrompt(opts: GenerateTagsUserPromptOpts): string {
  const content = opts.markdown.slice(0, MAX_CONTENT_CHARS);
  return `Existing tags in the system (prefer reusing these if relevant): ${opts.existingTags.join(', ')}\n\nSummary:\n${opts.summary}\n\nContent:\n${content}`;
}

/** System prompt for `extractTopics` in `tools/extract-topics.ts`. */
export function extractTopicsSystemPrompt(): string {
  return 'You are an expert content analyzer. Identify the primary topics discussed in the given content.';
}

export type ExtractTopicsUserPromptOpts = {
  markdown: string;
  summary: string;
  existingTopics: string[];
};

/** User prompt for `extractTopics` — truncates markdown to {@link MAX_CONTENT_CHARS}. */
export function extractTopicsUserPrompt(opts: ExtractTopicsUserPromptOpts): string {
  const content = opts.markdown.slice(0, MAX_CONTENT_CHARS);
  return `Existing topics in the system (prefer reusing names if relevant): ${opts.existingTopics.join(', ')}\n\nSummary:\n${opts.summary}\n\nContent:\n${content}`;
}

// TODO(T-001 follow-up): wire clean-content step — placeholders for Step 4 pipeline.

/** @internal Reserved for clean-content tool. */
export function cleanContentSystemPrompt(): string {
  return '';
}

/** @internal Reserved for clean-content tool. */
export function cleanContentUserPrompt(_raw: string): string {
  return '';
}
