import { db } from '@/db';
import { entries } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// Mock auth hook for the server route. In production, this verifies a JWT token.
function requireAuth(request: Request) {
  // For the sake of the template, we're returning a dummy UUID that would normally come from Supabase Auth
  return '00000000-0000-0000-0000-000000000000';
}

export async function GET(request: Request) {
  try {
    const userId = requireAuth(request);
    
    const userEntries = await db.select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.createdAt));

    return Response.json({ success: true, data: userEntries });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();

    const { url, title, type = 'url', content = '' } = body;

    // Create entry
    const [newEntry] = await db.insert(entries).values({
      userId,
      url,
      title,
      type,
      content,
      processedStatus: 'pending',
    }).returning();

    // Trigger ingest pipeline asynchronously (fire-and-forget for CF Workers/API route limits)
    // Note: In a real serverless environment, you might want to use a queue or background task here
    import('@/modules/ai/pipelines/ingest').then(({ processEntry }) => {
      processEntry(newEntry.id, userId).catch(console.error);
    });

    return Response.json({ success: true, data: newEntry });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
