import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import {
  generateTagsSystemPrompt,
  generateTagsUserPrompt,
} from '../prompts.js';

const generateTagsSchema = z.object({
  tags: z
    .array(z.string())
    .describe('An array of lowercase, concise tags that categorize the content.'),
});

export async function generateTags(markdown: string, summary: string, existingTags: string[] = []) {
  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({
        name: 'GenerateTags',
        description: 'Content tags for categorization.',
        schema: generateTagsSchema,
      }),
      system: generateTagsSystemPrompt(),
      prompt: generateTagsUserPrompt({ markdown, summary, existingTags }),
    });

    if (!output) {
      throw new Error('generateTags: model returned no structured output');
    }

    return output.tags;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('generateTags failed to generate valid object:', error.cause);
      console.error('Raw text:', error.text);
    } else {
      console.error('Error generating tags:', error);
    }
    throw error;
  }
}
