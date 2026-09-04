import { getCurrentUser, getCurrentUserRooms } from '@/lib/services/auth';
import { ok, err } from '@/lib/apiHelpers';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return err('Unauthorized', 401);
    }

    const rooms = await getCurrentUserRooms();

    return ok({ user, rooms });
  } catch (error) {
    console.error('[API] /api/auth/me error:', error);
    return err('An unexpected error occurred.', 500);
  }
}
