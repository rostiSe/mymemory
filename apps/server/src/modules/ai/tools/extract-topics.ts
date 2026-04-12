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
      console.error('extractTopics failed to generate valid object:', error.cause);
      console.error('Raw text:', error.text);
    } else {
      console.error('Error extracting topics:', error);
    }
    throw error;
  }
}
