import { createClient } from '@/lib/supabase/server';

export async function getUserPersonalSummary(userId: string) {
  const supabase = await createClient();

  // Fetch user profile stats
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, warning_limit')
    .eq('id', userId)
    .single();

  const warningLimit = Number(user?.warning_limit || 0);

  // Fetch structured personal incomes & loans
  const { data: personalIncomes } = await supabase
    .from('personal_incomes')
    .select('*')
    .eq('user_id', userId)
    .order('income_date', { ascending: false });

  const incomesList = personalIncomes || [];

  const totalPersonalIncome = incomesList
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalLoansBorrowed = incomesList
    .filter((item) => item.type === 'loan')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalGrossFunds = totalPersonalIncome + totalLoansBorrowed;

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
    (totalGrossFunds - totalPersonalSpent - totalAllocatedToRooms).toFixed(2)
  );

  const isWarningTriggered =
    warningLimit > 0 && totalPersonalSpent + totalAllocatedToRooms >= warningLimit;

  // Extract loan lenders list
  const lendersSummary: Record<string, number> = {};
  incomesList
    .filter((item) => item.type === 'loan' && item.lender_name)
    .forEach((item) => {
      const name = item.lender_name.trim();
      lendersSummary[name] = (lendersSummary[name] || 0) + Number(item.amount || 0);
    });

  return {
    user,
    totalIncome: Number(totalGrossFunds.toFixed(2)),
    totalPersonalIncome: Number(totalPersonalIncome.toFixed(2)),
    totalLoansBorrowed: Number(totalLoansBorrowed.toFixed(2)),
    warningLimit: Number(warningLimit.toFixed(2)),
    totalPersonalSpent: Number(totalPersonalSpent.toFixed(2)),
    totalAllocatedToRooms: Number(totalAllocatedToRooms.toFixed(2)),
    unallocatedBalance,
    isWarningTriggered,
    personalIncomes: incomesList,
    personalExpenses: personalExpenses || [],
    roomAllocations: memberships || [],
    lendersSummary: Object.entries(lendersSummary).map(([lender, amount]) => ({
      lender,
      amount: Number(amount.toFixed(2)),
    })),
  };
}

export async function updateUserProfile(
  userId: string,
  payload: { warning_limit?: number }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .update({
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

export async function addPersonalIncome(
  userId: string,
  payload: {
    source: string;
    type: 'income' | 'loan';
    lender_name?: string;
    amount: number;
    income_date?: string;
  }
) {
  const supabase = await createClient();

  if (!payload.source.trim()) throw new Error('Finance source title is required');
  if (payload.amount <= 0) throw new Error('Amount must be greater than 0');
  if (payload.type === 'loan' && !payload.lender_name?.trim()) {
    throw new Error('Lender / Person name is required for loan entries');
  }

  const { data, error } = await supabase
    .from('personal_incomes')
    .insert({
      user_id: userId,
      source: payload.source.trim(),
      type: payload.type,
      lender_name: payload.type === 'loan' ? payload.lender_name?.trim() : null,
      amount: Math.round(payload.amount * 100) / 100,
      income_date: payload.income_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add income/loan entry: ${error.message}`);
  }

  return data;
}

export async function deletePersonalIncome(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('personal_incomes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete entry: ${error.message}`);
  }

  return { success: true };
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

