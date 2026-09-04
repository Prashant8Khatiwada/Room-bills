import { createClient } from '@/lib/supabase/server';
import { allocateRoomBalance } from '@/lib/services/rooms';
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

    const body = await request.json();
    const allocated = await allocateRoomBalance(
      roomId,
      session.user.id,
      Number(body.amount)
    );
    return ok(allocated);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/allocate error:', error);
    return err(error.message || 'Failed to allocate room balance', 400);
  }
}
