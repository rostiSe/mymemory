/**
 * Central catalog of AI prompt builders. Used by tools under `tools/`.
 * Dynamic parts are passed as typed arguments; truncation for long markdown lives here.
 */

/** Max characters of markdown included in analysis and standalone tag/topic prompts. */
export const MAX_CONTENT_CHARS = 10_000;

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

/** System prompt for `analyzeContent` in `tools/analyze-content.ts`. */
export function analyzeContentSystemPrompt(): string {
  return `You are an expert content analyst. Given a piece of content, produce a structured analysis:
a concise descriptive headline (not the site name or a URL — a real headline capturing the main point),
a concise summary, key takeaways (specific claims, numbers, or techniques — not vague restatements),
relevant tags for categorization, the primary topics discussed, the ISO 639-1 language code (e.g. en, es, de, fr),
and the URL of the best content image if one exists (not logos, avatars, or icons).
When existing tags or topics are provided, prefer reusing them over inventing new ones.`;
}

export type AnalyzeContentUserPromptOpts = {
  markdown: string;
  existingTags?: string[];
  existingTopics?: string[];
  /** Image URLs found in the page (OG + markdown); model picks the best hero or null. */
  imageUrls?: string[];
};

/** User prompt for `analyzeContent` — truncates markdown to {@link MAX_CONTENT_CHARS}; lists existing tags/topics when non-empty. */
export function analyzeContentUserPrompt(opts: AnalyzeContentUserPromptOpts): string {
  const content = opts.markdown.slice(0, MAX_CONTENT_CHARS);
  const existingTags = opts.existingTags ?? [];
  const existingTopics = opts.existingTopics ?? [];
  const sections: string[] = [];

  if (existingTags.length > 0) {
    sections.push(
      `Existing tags in the system (prefer reusing these if relevant): ${existingTags.join(', ')}`,
    );
  }
  if (existingTopics.length > 0) {
    sections.push(
      `Existing topics in the system (prefer reusing names if relevant): ${existingTopics.join(', ')}`,
    );
  }

  if (opts.imageUrls?.length) {
    sections.push(
      `Image URLs found in the content (pick the best content image for heroImageUrl, or null if none are suitable):\n${opts.imageUrls.join('\n')}`,
    );
  }

  sections.push(`Content:\n${content}`);
  return sections.join('\n\n');
}

/** System prompt for `cleanContent` in `tools/clean-content.ts`. */
export function cleanContentSystemPrompt(): string {
  return `You are an expert content cleaner. Given raw scraped markdown from a web page,
remove: navigation menus, header/footer boilerplate, advertisements, cookie/consent banners,
sidebar content, social sharing buttons, related article links, comment sections,
and subscription prompts. Preserve: the main article content, headings, paragraphs,
code blocks, blockquotes, lists, tables, and meaningful images (keep their markdown syntax).
Return clean, well-structured markdown.`;
}

/** User prompt for `cleanContent` — full raw markdown slice is passed from the tool (see MAX_RAW_CHARS there). */
export function cleanContentUserPrompt(rawMarkdown: string): string {
  return `Clean the following raw scraped markdown:\n\n${rawMarkdown}`;
}
