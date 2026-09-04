import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdmin, listAdminUsers, setUserDisabled } from '@/lib/services/admin';
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
    const users = await listAdminUsers(search);
    return ok(users);
  } catch (error: any) {
    console.error('[API] GET /api/admin/users error:', error);
    return err(error.message || 'Forbidden', 403);
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('id');

    if (!targetUserId) {
      return err('Target user ID is required', 400);
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await assertPlatformAdmin(session.user.id);
    const body = await request.json();

    if (typeof body.disabled !== 'boolean') {
      return err('disabled boolean flag is required', 400);
    }

    await setUserDisabled(targetUserId, body.disabled, session.user.id);
    return ok(null);
  } catch (error: any) {
    console.error('[API] PATCH /api/admin/users error:', error);
    return err(error.message || 'Forbidden', 403);
  }
}
