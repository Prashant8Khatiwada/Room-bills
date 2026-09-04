import { createClient } from '@/lib/supabase/server';
import { getRoomMembers } from '@/lib/services/rooms';
import { ok, err } from '@/lib/apiHelpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const members = await getRoomMembers(roomId, session.user.id);
    return ok(members);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/members error:', error);
    return err(error.message || 'Failed to fetch members', 400);
  }
}
