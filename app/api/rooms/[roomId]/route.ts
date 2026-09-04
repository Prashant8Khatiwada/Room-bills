import { createClient } from '@/lib/supabase/server';
import { getRoomDetail } from '@/lib/services/rooms';
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

    const room = await getRoomDetail(roomId, session.user.id);
    return ok(room);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId error:', error);
    return err(error.message || 'Failed to fetch room detail', 400);
  }
}
