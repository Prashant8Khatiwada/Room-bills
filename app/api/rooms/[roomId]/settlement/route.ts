import { createClient } from '@/lib/supabase/server';
import { getCurrentSettlement, closeSettlementPeriodService } from '@/lib/services/settlement';
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

    const summary = await getCurrentSettlement(roomId, session.user.id);
    return ok(summary);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/settlement error:', error);
    return err(error.message || 'Failed to fetch settlement', 400);
  }
}

export async function POST(
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

    await closeSettlementPeriodService(roomId, session.user.id);
    return ok({ message: 'Period closed successfully' });
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/settlement/close error:', error);
    return err(error.message || 'Failed to close settlement period', 400);
  }
}
