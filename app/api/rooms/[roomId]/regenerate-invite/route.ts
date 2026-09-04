import { createClient } from '@/lib/supabase/server';
import { regenerateInviteCode } from '@/lib/services/rooms';
import { ok, err } from '@/lib/apiHelpers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const room = await regenerateInviteCode(roomId, session.user.id);
    return ok(room);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/regenerate-invite error:', error);
    return err(error.message || 'Failed to regenerate invite code', 400);
  }
}
