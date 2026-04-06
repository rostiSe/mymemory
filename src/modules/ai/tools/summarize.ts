import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Stub for text summarization using Vercel AI SDK
export async function summarizeText(text: string) {
  try {
    const { text: summary } = await generateText({
      model: openai('gpt-4o-mini'),
      system: 'You are a helpful assistant that concisely summarizes text.',
      prompt: `Summarize the following text:\n\n${text}`,
    });
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}
