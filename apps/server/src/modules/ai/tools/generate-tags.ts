import { createHash } from 'node:crypto';

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
      const rawText = error.text;
      const textLength = typeof rawText === 'string' ? rawText.length : 0;
      const textSha256Prefix =
        typeof rawText === 'string' && rawText.length > 0
          ? createHash('sha256').update(rawText).digest('hex').slice(0, 16)
          : undefined;

      console.error('generateTags failed to generate valid object:', {
        cause: error.cause,
        rawTextOmitted: true,
        textLength,
        ...(textSha256Prefix !== undefined ? { textSha256Prefix } : {}),
      });
    } else {
      console.error('Error generating tags:', error);
    }
    throw error;
  }
}
