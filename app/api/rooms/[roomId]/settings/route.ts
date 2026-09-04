import { createClient } from '@/lib/supabase/server';
import { getRoomDetail, updateRoomSettings } from '@/lib/services/rooms';
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

    const room = await getRoomDetail(roomId, session.user.id);
    return ok(room);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/settings error:', error);
    return err(error.message || 'Failed to fetch room settings', 400);
  }
}

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
    const room = await updateRoomSettings(roomId, session.user.id, body);
    return ok(room);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/settings error:', error);
    return err(error.message || 'Failed to update room settings', 400);
  }
}
