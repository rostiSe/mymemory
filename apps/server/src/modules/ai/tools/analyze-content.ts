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
});

export type AnalyzeContentResult = z.infer<typeof analyzeContentSchema>;

export async function analyzeContent(opts: {
  markdown: string;
  existingTags?: string[];
  existingTopics?: string[];
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

    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('analyzeContent failed to generate valid object:', error.cause);
      console.error('Raw text:', error.text);
    }
    throw error;
  }
}
