import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { joinRoom } from '@/lib/services/rooms';
import { inviteCodeSchema } from '@/lib/validations';
import { ok, err } from '@/lib/apiHelpers';

const joinRoomSchema = z.object({
  inviteCode: inviteCodeSchema,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const body = await request.json();
    const result = joinRoomSchema.safeParse(body);

    if (!result.success) {
      return err(result.error.issues[0].message, 400);
    }

    const room = await joinRoom(session.user.id, result.data.inviteCode);
    return ok(room);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/join error:', error);
    return err(error.message || 'Failed to join room', 400);
  }
}
