import { createClient } from '@/lib/supabase/server';
import { deletePersonalIncome } from '@/lib/services/personal';
import { ok, err } from '@/lib/apiHelpers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const result = await deletePersonalIncome(session.user.id, id);
    return ok(result);
  } catch (error: any) {
    console.error('[API] DELETE /api/user/personal-incomes/:id error:', error);
    return err(error.message || 'Failed to delete income/loan entry', 400);
  }
}
