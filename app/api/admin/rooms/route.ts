import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdmin, listAdminRooms, forceDeleteRoom } from '@/lib/services/admin';
import { ok, err } from '@/lib/apiHelpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await assertPlatformAdmin(session.user.id);
    const rooms = await listAdminRooms(search);
    return ok(rooms);
  } catch (error: any) {
    console.error('[API] GET /api/admin/rooms error:', error);
    return err(error.message || 'Forbidden', 403);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('id');

    if (!roomId) {
      return err('Room ID is required', 400);
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await assertPlatformAdmin(session.user.id);
    await forceDeleteRoom(roomId, session.user.id);
    return ok(null);
  } catch (error: any) {
    console.error('[API] DELETE /api/admin/rooms error:', error);
    return err(error.message || 'Forbidden', 403);
  }
}
