import { createClient } from '@/lib/supabase/server';
import { getUserPersonalSummary, addPersonalExpense } from '@/lib/services/personal';
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
    return ok(summary.personalExpenses);
  } catch (error: any) {
    console.error('[API] GET /api/user/personal-expenses error:', error);
    return err(error.message || 'Failed to fetch personal expenses', 400);
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
    const expense = await addPersonalExpense(
      session.user.id,
      body.title,
      Number(body.amount)
    );
    return ok(expense);
  } catch (error: any) {
    console.error('[API] POST /api/user/personal-expenses error:', error);
    return err(error.message || 'Failed to add personal expense', 400);
  }
}
