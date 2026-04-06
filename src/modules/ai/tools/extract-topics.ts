import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function extractTopics(markdown: string, summary: string, existingTopics: string[] = []) {
  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        topics: z.array(
          z.object({
            name: z.string().describe('The name of the topic, e.g., "React Native", "Artificial Intelligence"'),
            description: z.string().describe('A short sentence explaining why this topic is relevant to the content.')
          })
        ).describe('An array of 1 to 5 main topics discussed in the content.'),
      }),
      system: 'You are an expert content analyzer. Identify the primary topics discussed in the given content.',
      prompt: `Existing topics in the system (prefer reusing names if relevant): ${existingTopics.join(', ')}\n\nSummary:\n${summary}\n\nContent:\n${markdown.slice(0, 4000)}`,
    });
    
    return object.topics;
  } catch (error) {
    console.error('Error extracting topics:', error);
    throw error;
  }
}
