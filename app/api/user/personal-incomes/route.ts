import { createClient } from '@/lib/supabase/server';
import { getUserPersonalSummary, addPersonalIncome } from '@/lib/services/personal';
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
    return ok(summary.personalIncomes);
  } catch (error: any) {
    console.error('[API] GET /api/user/personal-incomes error:', error);
    return err(error.message || 'Failed to fetch personal incomes', 400);
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
    const result = await addPersonalIncome(session.user.id, {
      source: body.source,
      type: body.type,
      lender_name: body.lender_name,
      amount: Number(body.amount),
      income_date: body.income_date,
    });
    return ok(result);
  } catch (error: any) {
    console.error('[API] POST /api/user/personal-incomes error:', error);
    return err(error.message || 'Failed to add income/loan entry', 400);
  }
}
