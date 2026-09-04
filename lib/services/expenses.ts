import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';

export interface CreateExpenseInput {
  item_name: string;
  is_fixed: boolean;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  paid_by: string;
  expense_date: string;
  idempotency_key?: string;
  splits: { user_id: string; share: number }[];
}

export async function listExpenses(roomId: string, userId: string, periodId?: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  let targetPeriodId = periodId;

  if (!targetPeriodId) {
    const { data: openPeriod } = await supabase
      .from('settlement_periods')
      .select('id')
      .eq('room_id', roomId)
      .eq('status', 'open')
      .single();

    targetPeriodId = openPeriod?.id;
  }

  if (!targetPeriodId) return [];

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, paid_by_user:users!paid_by(id, name, email), expense_splits(*)')
    .eq('room_id', roomId)
    .eq('period_id', targetPeriodId)
    .order('expense_date', { ascending: false });

  return expenses || [];
}

export async function createExpense(roomId: string, userId: string, data: CreateExpenseInput) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  // Handle Idempotency
  if (data.idempotency_key) {
    const { data: existing } = await supabase
      .from('expenses')
      .select('*, expense_splits(*)')
      .eq('room_id', roomId)
      .eq('idempotency_key', data.idempotency_key)
      .single();

    if (existing) return existing;
  }

  // Resolve open period
  const { data: openPeriod } = await supabase
    .from('settlement_periods')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'open')
    .single();

  if (!openPeriod) {
    throw new Error('No open settlement period found for this room');
  }

  let finalProductId = data.product_id;

  // Fixed item catalog logic
  if (data.is_fixed && !finalProductId) {
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('room_id', roomId)
      .ilike('name', data.item_name.trim())
      .single();

    if (existingProduct) {
      finalProductId = existingProduct.id;
    } else {
      const { data: newProduct } = await supabase
        .from('products')
        .insert({
          room_id: roomId,
          name: data.item_name.trim(),
          default_price: data.unit_price,
        })
        .select()
        .single();

      finalProductId = newProduct?.id;
    }
  }

  // Validate splits sum server-side
  const sumSplits = data.splits.reduce((acc, curr) => acc + curr.share, 0);
  if (Math.abs(sumSplits - data.total_amount) > 0.01) {
    throw new Error('Expense splits sum must equal total amount');
  }

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      room_id: roomId,
      period_id: openPeriod.id,
      product_id: finalProductId || null,
      item_name: data.item_name.trim(),
      is_fixed: data.is_fixed,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total_amount: data.total_amount,
      paid_by: data.paid_by,
      expense_date: data.expense_date,
      idempotency_key: data.idempotency_key,
    })
    .select()
    .single();

  if (expenseError || !expense) {
    throw new Error(`Failed to create expense: ${expenseError?.message}`);
  }

  const splitRows = data.splits.map((s) => ({
    expense_id: expense.id,
    user_id: s.user_id,
    share: s.share,
  }));

  await supabase.from('expense_splits').insert(splitRows);

  return expense;
}

export async function deleteExpense(roomId: string, expenseId: string, userId: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: expense } = await supabase
    .from('expenses')
    .select('paid_by, room_id')
    .eq('id', expenseId)
    .single();

  if (!expense || expense.room_id !== roomId) {
    throw new Error('Expense not found');
  }

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  const isOwner = member?.role === 'owner';
  const isCreator = expense.paid_by === userId;

  if (!isOwner && !isCreator) {
    throw new Error('Forbidden: Only the expense creator or room owner can delete this expense');
  }

  await supabase.from('expenses').delete().eq('id', expenseId);
}
