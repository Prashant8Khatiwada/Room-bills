import { createClient } from '@/lib/supabase/server';

export async function getUserPersonalSummary(userId: string) {
  const supabase = await createClient();

  // Fetch user profile stats
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, total_income, warning_limit')
    .eq('id', userId)
    .single();

  const totalIncome = Number(user?.total_income || 0);
  const warningLimit = Number(user?.warning_limit || 0);

  // Fetch personal expenses
  const { data: personalExpenses } = await supabase
    .from('personal_expenses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const totalPersonalSpent = (personalExpenses || []).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  // Fetch allocated room balances across all rooms user belongs to
  const { data: memberships } = await supabase
    .from('room_members')
    .select('allocated_balance, rooms(id, name)')
    .eq('user_id', userId);

  const totalAllocatedToRooms = (memberships || []).reduce(
    (sum, item) => sum + Number(item.allocated_balance || 0),
    0
  );

  const unallocatedBalance = Number(
    (totalIncome - totalPersonalSpent - totalAllocatedToRooms).toFixed(2)
  );

  const isWarningTriggered =
    warningLimit > 0 && totalPersonalSpent + totalAllocatedToRooms >= warningLimit;

  return {
    user,
    totalIncome: Number(totalIncome.toFixed(2)),
    warningLimit: Number(warningLimit.toFixed(2)),
    totalPersonalSpent: Number(totalPersonalSpent.toFixed(2)),
    totalAllocatedToRooms: Number(totalAllocatedToRooms.toFixed(2)),
    unallocatedBalance,
    isWarningTriggered,
    personalExpenses: personalExpenses || [],
    roomAllocations: memberships || [],
  };
}

export async function updateUserProfile(
  userId: string,
  payload: { total_income?: number; warning_limit?: number }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .update({
      ...(payload.total_income !== undefined && { total_income: Math.max(0, payload.total_income) }),
      ...(payload.warning_limit !== undefined && { warning_limit: Math.max(0, payload.warning_limit) }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

export async function addPersonalExpense(userId: string, title: string, amount: number) {
  const supabase = await createClient();

  if (!title.trim()) throw new Error('Expense title is required');
  if (amount <= 0) throw new Error('Amount must be greater than 0');

  const { data, error } = await supabase
    .from('personal_expenses')
    .insert({
      user_id: userId,
      title: title.trim(),
      amount: Math.round(amount * 100) / 100,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add personal expense: ${error.message}`);
  }

  return data;
}
