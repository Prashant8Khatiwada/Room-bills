import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { listExpenses, createExpense, deleteExpense } from '@/lib/services/expenses';
import { moneyAmount } from '@/lib/validations';
import { ok, err } from '@/lib/apiHelpers';

const createExpenseSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(200),
  is_fixed: z.boolean(),
  product_id: z.string().uuid().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: moneyAmount,
  total_amount: moneyAmount,
  paid_by: z.string().uuid(),
  expense_date: z.string(),
  splits: z.array(
    z.object({
      user_id: z.string().uuid(),
      share: moneyAmount,
    })
  ).min(1, 'At least one member split is required'),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId') || undefined;

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const expenses = await listExpenses(roomId, session.user.id, periodId);
    return ok(expenses);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/expenses error:', error);
    return err(error.message || 'Failed to fetch expenses', 400);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const idempotencyKey = request.headers.get('Idempotency-Key') || undefined;

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const body = await request.json();
    const result = createExpenseSchema.safeParse(body);

    if (!result.success) {
      return err(result.error.issues[0].message, 400);
    }

    const expense = await createExpense(roomId, session.user.id, {
      ...result.data,
      idempotency_key: idempotencyKey,
    });

    return ok(expense);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/expenses error:', error);
    return err(error.message || 'Failed to create expense', 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('id');

    if (!expenseId) {
      return err('Expense ID is required', 400);
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await deleteExpense(roomId, expenseId, session.user.id);
    return ok(null);
  } catch (error: any) {
    console.error('[API] DELETE /api/rooms/:roomId/expenses error:', error);
    return err(error.message || 'Failed to delete expense', 400);
  }
}
