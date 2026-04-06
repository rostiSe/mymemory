import { db } from '@/db';
import { spaces } from '@/db/schema';
import { eq } from 'drizzle-orm';

function requireAuth(request: Request) {
  return '00000000-0000-0000-0000-000000000000';
}

export async function GET(request: Request) {
  try {
    const userId = requireAuth(request);
    
    const userSpaces = await db.select()
      .from(spaces)
      .where(eq(spaces.userId, userId));

    return Response.json({ success: true, data: userSpaces });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = requireAuth(request);
    const { name, description } = await request.json();

    const [newSpace] = await db.insert(spaces).values({
      userId,
      name,
      description,
    }).returning();

    return Response.json({ success: true, data: newSpace });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
