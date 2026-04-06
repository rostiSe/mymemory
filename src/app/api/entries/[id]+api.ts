import { db } from '@/db';
import { entries } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

function requireAuth(_request: Request) {
  return '00000000-0000-0000-0000-000000000000';
}

export async function GET(
  request: Request,
  { id }: { id: string },
) {
  try {
    const userId = requireAuth(request);

    const [row] = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .limit(1);

    if (!row) {
      return Response.json(
        { success: false, error: 'Entry not found' },
        { status: 404 },
      );
    }

    return Response.json({ success: true, data: row });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
