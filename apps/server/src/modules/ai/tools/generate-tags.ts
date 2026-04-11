import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import {
  generateTagsSystemPrompt,
  generateTagsUserPrompt,
} from '../prompts.js';

export async function generateTags(markdown: string, summary: string, existingTags: string[] = []) {
  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        tags: z.array(z.string()).describe('An array of lowercase, concise tags that categorize the content.'),
      }),
      system: generateTagsSystemPrompt(),
      prompt: generateTagsUserPrompt({ markdown, summary, existingTags }),
    });
    
    return object.tags;
  } catch (error) {
    console.error('Error generating tags:', error);
    throw error;
  }
}
