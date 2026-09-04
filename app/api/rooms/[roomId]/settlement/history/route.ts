import { createClient } from '@/lib/supabase/server';
import { getSettlementHistory } from '@/lib/services/settlement';
import { ok, err } from '@/lib/apiHelpers';

export async function GET(
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

    const history = await getSettlementHistory(roomId, session.user.id);
    return ok(history);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/settlement/history error:', error);
    return err(error.message || 'Failed to fetch settlement history', 400);
  }
}
