import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import { cleanContentSystemPrompt, cleanContentUserPrompt } from '../prompts.js';

const cleanContentSchema = z.object({
  readableContent: z.string().describe(
    'The cleaned markdown with navigation, ads, cookie banners, sidebars, footers, and boilerplate removed. Preserve article headings, paragraphs, code blocks, lists, and meaningful images (keep their markdown syntax).',
  ),
});

/** Max raw chars to send to the cleaning model (cost guard). */
const MAX_RAW_CHARS = 80_000;

export async function cleanContent(rawMarkdown: string): Promise<string> {
  const input =
    rawMarkdown.length > MAX_RAW_CHARS ? rawMarkdown.slice(0, MAX_RAW_CHARS) : rawMarkdown;

  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({
        name: 'CleanContent',
        description: 'Noise-removed readable markdown.',
        schema: cleanContentSchema,
      }),
      system: cleanContentSystemPrompt(),
      prompt: cleanContentUserPrompt(input),
    });

    if (!output) {
      throw new Error('cleanContent: model returned no structured output');
    }

    return output.readableContent;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error('cleanContent failed to generate valid object:', error.cause);
      console.error('Raw text:', error.text);
    } else {
      console.error('Error cleaning content:', error);
    }
    throw error;
  }
}
