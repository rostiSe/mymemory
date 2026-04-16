/**
 * Central catalog of AI prompt builders. Used by tools under `tools/`.
 * Dynamic parts are passed as typed arguments; truncation for long markdown lives here.
 */

/** Max characters of markdown included in analysis and standalone tag/topic prompts. */
export const MAX_CONTENT_CHARS = 10_000;

/** System prompt for `summarizeText` in `tools/summarize.ts`. */
export function summarizeSystemPrompt(): string {
  return "You are a helpful assistant that concisely summarizes text.";
}

/** User prompt for `summarizeText` — full text to summarize. */
export function summarizeUserPrompt(text: string): string {
  return `Summarize the following text:\n\n${text}`;
}

/** System prompt for `generateTags` in `tools/generate-tags.ts`. */
export function generateTagsSystemPrompt(): string {
  return "You are an expert content categorizer. Given the content and its summary, generate a concise list of relevant tags.";
}

export type GenerateTagsUserPromptOpts = {
  markdown: string;
  summary: string;
  existingTags: string[];
};

/** User prompt for `generateTags` — truncates markdown to {@link MAX_CONTENT_CHARS}. */
export function generateTagsUserPrompt(
  opts: GenerateTagsUserPromptOpts,
): string {
  const content = opts.markdown.slice(0, MAX_CONTENT_CHARS);
  return `Existing tags in the system (prefer reusing these if relevant): ${opts.existingTags.join(", ")}\n\nSummary:\n${opts.summary}\n\nContent:\n${content}`;
}

/** System prompt for `extractTopics` in `tools/extract-topics.ts`. */
export function extractTopicsSystemPrompt(): string {
  return "You are an expert content analyzer. Identify the primary topics discussed in the given content.";
}

export type ExtractTopicsUserPromptOpts = {
  markdown: string;
  summary: string;
  existingTopics: string[];
};

/** User prompt for `extractTopics` — truncates markdown to {@link MAX_CONTENT_CHARS}. */
export function extractTopicsUserPrompt(
  opts: ExtractTopicsUserPromptOpts,
): string {
  const content = opts.markdown.slice(0, MAX_CONTENT_CHARS);
  return `Existing topics in the system (prefer reusing names if relevant): ${opts.existingTopics.join(", ")}\n\nSummary:\n${opts.summary}\n\nContent:\n${content}`;
}

/** System prompt for `analyzeContent` in `tools/analyze-content.ts`. */
export function analyzeContentSystemPrompt(): string {
  return `You are an expert content analyst. Given a piece of content, produce a structured analysis:
a concise descriptive headline (not the site name or a URL — a real headline capturing the main point),
a concise summary, key takeaways (specific claims, numbers, or techniques — not vague restatements),
relevant tags for categorization, the primary topics discussed, the ISO 639-1 language code (e.g. en, es, de, fr),
and the URL of the best content image if one exists (not logos, avatars, or icons).
Classify the content type (article, tutorial, reference, opinion, recipe, list, note, bookmark)
and depth (shallow/medium/deep based on word count and detail level).
Extract author names from bylines or metadata when available.
When existing tags are provided, prefer reusing them over inventing new ones.
When existing topics are listed with descriptions, you MUST reuse an existing topic name when it covers the same
concept — even if you'd phrase it differently. "ML" and "Machine Learning" are the same topic;
use whichever already exists (exact spelling of the existing name). Only create a new topic when no existing one covers the concept.`;
}

export type AnalyzeContentUserPromptOpts = {
  markdown: string;
  existingTags?: string[];
  existingTopics?: Array<{ name: string; description: string | null }>;
  /** Image URLs found in the page (OG + markdown); model picks the best hero or null. */
  imageUrls?: string[];
};

/** User prompt for `analyzeContent` — truncates markdown to {@link MAX_CONTENT_CHARS}; lists existing tags/topics when non-empty. */
export function analyzeContentUserPrompt(
  opts: AnalyzeContentUserPromptOpts,
): string {
  const content = opts.markdown.slice(0, MAX_CONTENT_CHARS);
  const existingTags = opts.existingTags ?? [];
  const existingTopicsWithDescriptions = opts.existingTopics ?? [];
  const sections: string[] = [];

  if (existingTags.length > 0) {
    sections.push(
      `Existing tags in the system (prefer reusing these if relevant): ${existingTags.join(", ")}`,
    );
  }
  if (existingTopicsWithDescriptions.length > 0) {
    const topicList = existingTopicsWithDescriptions
      .map((t) => `- "${t.name}": ${t.description ?? 'no description'}`)
      .join('\n');
    sections.push(
      'Existing topics in the system. You MUST reuse an existing topic name when the meaning matches, '
        + 'even if the wording differs (e.g. use "Machine Learning" instead of creating "ML"):\n'
        + topicList,
    );
  }

  if (opts.imageUrls?.length) {
    sections.push(
      `Image URLs found in the content (pick the best content image for heroImageUrl, or null if none are suitable):\n${opts.imageUrls.join("\n")}`,
    );
  }

  sections.push(`Content:\n${content}`);
  return sections.join("\n\n");
}

/** System prompt for `classifyEntryToSpaces` in `tools/classify-entry.ts`. */
export function classifyEntrySystemPrompt(): string {
  return `You are a librarian organizing a personal knowledge base. Given an entry's metadata
and a list of existing spaces (categories), determine which space(s) the entry belongs to.

Rules:
- Return 0-3 space assignments.
- Only assign when genuinely relevant — don't force-fit.
- Cross-cutting entries (e.g. "AI Coding Assistants") can belong to 2-3 spaces.
- Confidence 0.0-1.0: how certain you are the entry belongs in that space.
  - 0.9-1.0: obvious, direct match (React tutorial → "React" space)
  - 0.7-0.9: strong match, related topic
  - 0.5-0.7: loose match, tangentially related
  - Below 0.5: don't assign
- If no space fits, return an empty assignments array.
- Prefer specific spaces over broad parent spaces when both exist.
- Only return spaceIds that appear in the provided spaces list. Never invent new ones.`;
}

export type ClassifyEntryUserPromptOpts = {
  entry: {
    title: string | null;
    summary: string | null;
    topics: string[];
    tags: string[];
    contentType: string | null;
    depth: string | null;
  };
  existingSpaces: Array<{
    id: string;
    name: string;
    description: string | null;
    entryCount: number;
  }>;
};

/** User prompt for `classifyEntryToSpaces`. */
export function classifyEntryUserPrompt(
  opts: ClassifyEntryUserPromptOpts,
): string {
  const { entry, existingSpaces } = opts;
  const sections: string[] = [];

  const entryLines = [
    `Title: ${entry.title ?? "(no title)"}`,
    `Summary: ${entry.summary ?? "(no summary)"}`,
    `Topics: ${entry.topics.length > 0 ? entry.topics.join(", ") : "(none)"}`,
    `Tags: ${entry.tags.length > 0 ? entry.tags.join(", ") : "(none)"}`,
    `Content type: ${entry.contentType ?? "(unknown)"}`,
    `Depth: ${entry.depth ?? "(unknown)"}`,
  ];
  sections.push(`Entry:\n${entryLines.join("\n")}`);

  const spaceLines = existingSpaces.map((s) => {
    const desc = s.description?.trim() ? ` — ${s.description.trim()}` : "";
    return `- [${s.id}] "${s.name}" (${s.entryCount} entries)${desc}`;
  });
  sections.push(`Existing spaces:\n${spaceLines.join("\n")}`);

  sections.push(
    "Return 0-3 assignments. Only use spaceIds from the list above.",
  );

  return sections.join("\n\n");
}

/** System prompt for `cleanContent` in `tools/clean-content.ts`. */
export function cleanContentSystemPrompt(): string {
  return `You are an expert content cleaner. Given raw scraped markdown from a web page,
remove: navigation menus, header/footer boilerplate, advertisements, cookie/consent banners,
sidebar content, social sharing buttons, related article links, comment sections, blank spaces, 
and subscription prompts. !IMPORTANT: Preserve: the main article content, headings, paragraphs,
code blocks, blockquotes, lists, tables, and meaningful images (keep their markdown syntax).
Return clean, well-structured markdown.`;
}

/** User prompt for `cleanContent` — full raw markdown slice is passed from the tool (see MAX_RAW_CHARS there). */
export function cleanContentUserPrompt(rawMarkdown: string): string {
  return `Clean the following raw scraped markdown but retain the original structure and content:\n\n${rawMarkdown}`;
}
