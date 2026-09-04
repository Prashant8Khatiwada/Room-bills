import { createClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/apiHelpers';

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return err('Could not sign out. Please try again.', 400);
    }

    return ok(null);
  } catch (error) {
    console.error('[API] /api/auth/logout error:', error);
    return err('An unexpected error occurred during logout.', 500);
  }
}
