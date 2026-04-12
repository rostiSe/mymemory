import { createHash } from 'node:crypto';

import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import {
  extractTopicsSystemPrompt,
  extractTopicsUserPrompt,
} from '../prompts.js';

const extractTopicsSchema = z.object({
  topics: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            'The name of the topic, e.g., "React Native", "Artificial Intelligence"',
          ),
        description: z
          .string()
          .describe(
            'A short sentence explaining why this topic is relevant to the content.',
          ),
      }),
    )
    .describe('An array of 1 to 5 main topics discussed in the content.'),
});

export async function extractTopics(
  markdown: string,
  summary: string,
  existingTopics: string[] = [],
) {
  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({
        name: 'ExtractTopics',
        description: 'Primary topics discussed in the content.',
        schema: extractTopicsSchema,
      }),
      system: extractTopicsSystemPrompt(),
      prompt: extractTopicsUserPrompt({ markdown, summary, existingTopics }),
    });

    if (!output) {
      throw new Error('extractTopics: model returned no structured output');
    }

    return output.topics;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const rawText = error.text;
      const textLength = typeof rawText === 'string' ? rawText.length : 0;
      const textSha256Prefix =
        typeof rawText === 'string' && rawText.length > 0
          ? createHash('sha256').update(rawText).digest('hex').slice(0, 16)
          : undefined;

      console.error('extractTopics failed to generate valid object:', {
        cause: error.cause,
        rawTextOmitted: true,
        textLength,
        ...(textSha256Prefix !== undefined ? { textSha256Prefix } : {}),
      });
    } else {
      console.error('Error extracting topics:', error);
    }
    throw error;
  }
}
