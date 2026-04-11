import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

import {
  summarizeSystemPrompt,
  summarizeUserPrompt,
} from '../prompts.js';

// Stub for text summarization using Vercel AI SDK
export async function summarizeText(text: string) {
  try {
    const { text: summary } = await generateText({
      model: openai('gpt-4o-mini'),
      system: summarizeSystemPrompt(),
      prompt: summarizeUserPrompt(text),
    });
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}
