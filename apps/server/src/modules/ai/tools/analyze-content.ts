import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import {
  analyzeContentSystemPrompt,
  analyzeContentUserPrompt,
} from '../prompts.js';

export const analyzeContentSchema = z.object({
  summary: z.string().describe(
    'A concise 2-4 sentence summary capturing the essence of the content.',
  ),
  keyPoints: z
    .array(z.string())
    .min(3)
    .max(7)
    .describe(
      'Key takeaways: specific claims, numbers, techniques, or actionable insights worth remembering.',
    ),
  tags: z.array(z.string()).describe(
    'Lowercase, concise tags that categorize the content. Prefer reusing existing tags when relevant.',
  ),
  topics: z
    .array(
      z.object({
        name: z
          .string()
          .describe('Topic name, e.g. "React Native", "Artificial Intelligence"'),
        description: z
          .string()
          .describe('One sentence on why this topic is relevant to the content.'),
      }),
    )
    .min(1)
    .max(5)
    .describe('Primary topics discussed in the content.'),
  language: z
    .string()
    .describe(
      'ISO 639-1 language code of the content, e.g. "en", "es", "de", "fr".',
    ),
  title: z.string().describe(
    'A concise, descriptive headline (5-12 words) that captures the main point of the content. '
      + 'Write it like a newspaper headline — clear, specific, informative. '
      + 'Do NOT use the site name, domain, or generic phrases like "Home" or "Welcome".',
  ),
  // Note: do not use z.string().url() — OpenAI structured outputs reject JSON Schema `format: "uri"`.
  heroImageUrl: z
    .union([z.string(), z.null()])
    .describe(
      'Absolute https or http URL of the most visually relevant content image — a photo, diagram, '
        + "illustration, or chart that represents the article's subject. "
        + 'Return null if no suitable image exists. '
        + 'EXCLUDE: site logos, favicons, author avatars, social media icons, '
        + 'tracking pixels, ads, and generic stock banners.',
    ),
});

export type AnalyzeContentResult = z.infer<typeof analyzeContentSchema>;

function normalizeHeroImageUrl(value: string | null): string | null {
  if (value === null || value.trim() === '') return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

export async function analyzeContent(opts: {
  markdown: string;
  existingTags?: string[];
  existingTopics?: string[];
  imageUrls?: string[];
}): Promise<AnalyzeContentResult> {
  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({
        name: 'ContentAnalysis',
        description: 'Structured analysis of a piece of content.',
        schema: analyzeContentSchema,
      }),
      system: analyzeContentSystemPrompt(),
      prompt: analyzeContentUserPrompt(opts),
    });

    if (!output) {
      throw new Error('analyzeContent: model returned no structured output');
    }

    return {
      ...output,
      heroImageUrl: normalizeHeroImageUrl(output.heroImageUrl),
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('analyzeContent failed to generate valid object:', error.cause);
      console.error('Raw text:', error.text);
    }
    throw error;
  }
}
