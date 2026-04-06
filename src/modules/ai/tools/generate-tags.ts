import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function generateTags(markdown: string, summary: string, existingTags: string[] = []) {
  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        tags: z.array(z.string()).describe('An array of lowercase, concise tags that categorize the content.'),
      }),
      system: 'You are an expert content categorizer. Given the content and its summary, generate a concise list of relevant tags.',
      prompt: `Existing tags in the system (prefer reusing these if relevant): ${existingTags.join(', ')}\n\nSummary:\n${summary}\n\nContent:\n${markdown.slice(0, 4000)}`,
    });
    
    return object.tags;
  } catch (error) {
    console.error('Error generating tags:', error);
    throw error;
  }
}
