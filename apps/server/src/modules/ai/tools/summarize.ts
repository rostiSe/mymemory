import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import {
  summarizeSystemPrompt,
  summarizeUserPrompt,
} from '../prompts.js';

const summarizeSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary capturing the essence of the input text.'),
});

// Stub for text summarization using Vercel AI SDK
export async function summarizeText(text: string) {
  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({
        name: 'Summarize',
        description: 'A short plain-text summary of the input.',
        schema: summarizeSchema,
      }),
      system: summarizeSystemPrompt(),
      prompt: summarizeUserPrompt(text),
    });

    if (!output) {
      throw new Error('summarizeText: model returned no structured output');
    }

    return output.summary;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('summarizeText failed to generate valid object:', error.cause);
      console.error('Raw text:', error.text);
    } else {
      console.error('Error generating summary:', error);
    }
    throw error;
  }
}
