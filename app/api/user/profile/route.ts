import { createClient } from '@/lib/supabase/server';
import { getUserPersonalSummary, updateUserProfile } from '@/lib/services/personal';
import { ok, err } from '@/lib/apiHelpers';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const summary = await getUserPersonalSummary(session.user.id);
    return ok(summary);
  } catch (error: any) {
    console.error('[API] GET /api/user/profile error:', error);
    return err(error.message || 'Failed to fetch personal profile summary', 400);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const body = await request.json();
    const updated = await updateUserProfile(session.user.id, body);
    return ok(updated);
  } catch (error: any) {
    console.error('[API] POST /api/user/profile error:', error);
    return err(error.message || 'Failed to update personal profile', 400);
  }
}
