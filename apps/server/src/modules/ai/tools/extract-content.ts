// Jina Reader API Integration
// Extracts clean Markdown from any URL using ReaderLM v2

export async function extractContentFromUrl(url: string): Promise<string> {
  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) {
    throw new Error('JINA_API_KEY is not set');
  }

  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

  try {
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jinaKey}`,
        // Use ReaderLM v2 for the highest quality markdown
        'X-Reader-Model': 'readerlm-v2',
        // Optional: Remove images and links if we just want clean text for embedding
        'X-Remove-Images': 'true', 
      },
    });

    if (!response.ok) {
      throw new Error(`Jina Reader API error: ${response.statusText}`);
    }

    const markdown = await response.text();
    return markdown;
  } catch (error) {
    console.error('Error extracting content via Jina Reader:', error);
    throw error;
  }
}
