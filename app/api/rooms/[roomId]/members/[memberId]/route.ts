import { createClient } from '@/lib/supabase/server';
import { updateMemberRole, removeMember } from '@/lib/services/rooms';
import { ok, err } from '@/lib/apiHelpers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string; memberId: string }> }
) {
  try {
    const { roomId, memberId } = await params;
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const body = await request.json();
    const role = body.role as 'owner' | 'member';

    if (!role || !['owner', 'member'].includes(role)) {
      return err('Invalid role specified', 400);
    }

    const updated = await updateMemberRole(roomId, session.user.id, memberId, role);
    return ok(updated);
  } catch (error: any) {
    console.error('[API] PATCH /api/rooms/:roomId/members/:memberId error:', error);
    return err(error.message || 'Failed to update member role', 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string; memberId: string }> }
) {
  try {
    const { roomId, memberId } = await params;
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const result = await removeMember(roomId, session.user.id, memberId);
    return ok(result);
  } catch (error: any) {
    console.error('[API] DELETE /api/rooms/:roomId/members/:memberId error:', error);
    return err(error.message || 'Failed to remove member', 400);
  }
}
