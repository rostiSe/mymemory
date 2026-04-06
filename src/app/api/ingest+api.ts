import { db } from '@/db';
import { entries } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processEntry } from '@/modules/ai/pipelines/ingest';

function requireAuth(request: Request) {
  return '00000000-0000-0000-0000-000000000000';
}

export async function POST(request: Request) {
  try {
    const userId = requireAuth(request);
    const { entryId } = await request.json();

    if (!entryId) {
      return Response.json({ error: 'entryId is required' }, { status: 400 });
    }

    // Process synchronously so we can return the result
    await processEntry(entryId, userId);

    const [updatedEntry] = await db.select().from(entries).where(eq(entries.id, entryId));

    return Response.json({ success: true, data: updatedEntry });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
