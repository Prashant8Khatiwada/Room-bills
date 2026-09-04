import { createClient } from '@/lib/supabase/server';
import { assertPlatformAdmin, getPlatformStats } from '@/lib/services/admin';
import { ok, err } from '@/lib/apiHelpers';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await assertPlatformAdmin(session.user.id);
    const stats = await getPlatformStats();
    return ok(stats);
  } catch (error: any) {
    console.error('[API] GET /api/admin/stats error:', error);
    return err(error.message || 'Forbidden', 403);
  }
}
