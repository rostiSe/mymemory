import { extractContentFromUrl } from '@/modules/ai/tools/extract-content';
import { summarizeText } from '@/modules/ai/tools/summarize';
import { generateEmbedding } from '@/modules/ai/tools/generate-embedding';

export async function POST(request: Request) {
  try {
    const { url, text } = await request.json();

    if (!process.env.JINA_API_KEY) {
      return Response.json({ error: 'JINA_API_KEY is not set in environment variables. Please add it to your .env file.' }, { status: 500 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: 'OPENAI_API_KEY is not set in environment variables. Please add it to your .env file.' }, { status: 500 });
    }

    let extractedText = text || '';

    // Step 1: Jina Reader Extraction
    if (url) {
      extractedText = await extractContentFromUrl(url);
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
