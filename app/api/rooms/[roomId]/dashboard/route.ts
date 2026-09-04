import { createClient } from '@/lib/supabase/server';
import { getRoomDashboardData } from '@/lib/services/dashboard';
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

    const dashboardData = await getRoomDashboardData(roomId, session.user.id);
    return ok(dashboardData);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/dashboard error:', error);
    const msg = error.message || '';
    if (msg.includes('Unauthorized') || msg.includes('Not a member')) {
      return err(msg, 403);
    }
    if (msg.includes('Room not found')) {
      return err(msg, 404);
    }
    return err(msg || 'Failed to fetch room dashboard data', 400);
  }
}
