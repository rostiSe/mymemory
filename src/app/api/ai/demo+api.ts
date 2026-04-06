import { extractContentFromUrl } from '@/modules/ai/tools/extract-content';
import {
  extractMediumArticleWithFirecrawl,
  isMediumArticleUrl,
} from '@/modules/ai/tools/extract-content-medium-firecrawl';
import { summarizeText } from '@/modules/ai/tools/summarize';
import { generateEmbedding } from '@/modules/ai/tools/generate-embedding';

export async function POST(request: Request) {
  try {
    const { url, text } = await request.json();

    const urlStr = typeof url === 'string' ? url : '';
    const useMediumFirecrawl = Boolean(urlStr && isMediumArticleUrl(urlStr));

    if (useMediumFirecrawl && !process.env.FIRECRAWL_API_KEY?.trim()) {
      return Response.json(
        {
          error:
            'This URL looks like Medium; set FIRECRAWL_API_KEY and optional FIRECRAWL_MEDIUM_COOKIE or FIRECRAWL_MEDIUM_PROFILE for member content.',
        },
        { status: 500 },
      );
    }
    if (!useMediumFirecrawl && !process.env.JINA_API_KEY) {
      return Response.json({ error: 'JINA_API_KEY is not set in environment variables. Please add it to your .env file.' }, { status: 500 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'OPENAI_API_KEY is not set in environment variables. Please add it to your .env file.' }, { status: 500 });
    }

    let extractedText = text || '';

    // Step 1: Medium → Firecrawl; otherwise Jina Reader
    if (urlStr) {
      extractedText = useMediumFirecrawl
        ? await extractMediumArticleWithFirecrawl(urlStr)
        : await extractContentFromUrl(urlStr);
    }

    if (!extractedText) {
      return Response.json({ error: 'Failed to extract content, or no URL provided.' }, { status: 400 });
    }

    // Step 2: OpenAI Summarization
    const summary = await summarizeText(extractedText);
    
    // Step 3: OpenAI Embedding
    const embedding = await generateEmbedding(summary);

    return Response.json({
      success: true,
      extractedText: url ? extractedText.substring(0, 300) + '... (truncated)' : extractedText,
      summary,
      embeddingPreview: embedding.slice(0, 5), // return first 5 numbers of array
      embeddingLength: embedding.length
    });
  } catch (error: any) {
    console.error('AI Demo API Error:', error);
    return Response.json({ error: error.message || 'An unexpected server error occurred' }, { status: 500 });
  }
}
