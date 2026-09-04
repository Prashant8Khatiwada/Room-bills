import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createRoom, listUserRooms } from '@/lib/services/rooms';
import { ok, err } from '@/lib/apiHelpers';

const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const rooms = await listUserRooms(session.user.id);
    return ok(rooms);
  } catch (error) {
    console.error('[API] GET /api/rooms error:', error);
    return err('Failed to fetch rooms', 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const body = await request.json();
    const result = createRoomSchema.safeParse(body);

    if (!result.success) {
      return err(result.error.issues[0].message, 400);
    }

    const room = await createRoom(session.user.id, result.data.name);
    return ok(room);
  } catch (error: any) {
    console.error('[API] POST /api/rooms error:', error);
    return err(error.message || 'Failed to create room', 400);
  }
}
