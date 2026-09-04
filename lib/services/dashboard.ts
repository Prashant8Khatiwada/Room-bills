import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from '@/lib/services/rooms';
import { getCurrentSettlement } from '@/lib/services/settlement';

export interface RoomDashboardData {
  room: {
    id: string;
    name: string;
    inviteCode: string;
    currency: string;
    minBalanceRequired: number;
    targetBudget: number;
    createdAt: string;
  };
  stats: {
    totalExpensesAmount: number;
    totalExpensesCount: number;
    totalBillsAmount: number;
    totalBillsCount: number;
    memberCount: number;
    userNetBalance: number;
    totalRoomPool: number;
  };
  membersContribution: Array<{
    userId: string;
    name: string;
    email: string;
    totalPaid: number;
    allocatedBalance: number;
    percentage: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'expense' | 'bill';
    title: string;
    amount: number;
    paidByName: string;
    date: string;
    category?: string;
  }>;
  settlementSummary: {
    transactionsCount: number;
    settled: boolean;
  };
}

export async function getRoomDashboardData(
  roomId: string,
  userId: string
): Promise<RoomDashboardData> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  // 1. Room info (select * to avoid schema mismatches if optional columns are absent)
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    console.error('[Dashboard Service] Room fetch error:', roomError);
    throw new Error('Room not found');
  }

  // 2. Members info
  const { data: membersData } = await supabase
    .from('room_members')
    .select('*, users(id, name, email)')
    .eq('room_id', roomId);

  const members = (membersData || []).map((m: any) => ({
    userId: m.user_id,
    name: m.users?.name || m.users?.email?.split('@')[0] || 'Member',
    email: m.users?.email || '',
    allocatedBalance: Number(m.allocated_balance || 0),
  }));

  const totalRoomPool = members.reduce((sum, m) => sum + m.allocatedBalance, 0);

  // 3. Bills & Expenses (All recorded in bills table)
  let bills: any[] = [];
  try {
    const { data: billsData, error: billsErr } = await supabase
      .from('bills')
      .select('*, users!paid_by(name, email)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (billsErr) {
      const { data: fallbackBills } = await supabase
        .from('bills')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });
      bills = fallbackBills || [];
    } else {
      bills = billsData || [];
    }
  } catch {
    bills = [];
  }

  // 4. Settlement information
  let settlementData: any = {
    balances: [],
    transactions: [],
  };
  try {
    settlementData = await getCurrentSettlement(roomId, userId);
  } catch (err) {
    console.warn('[Dashboard Service] Settlement calculation fallback:', err);
  }

  const rentBills = (bills || []).filter((b) => (b.category || 'rent') === 'rent');
  const expenseBills = (bills || []).filter((b) => b.category === 'expense');

  const totalBillsAmount = rentBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalBillsCount = rentBills.length;

  const totalExpensesAmount = expenseBills.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalExpensesCount = expenseBills.length;

  // Calculate member contributions
  const paidMap: Record<string, number> = {};
  members.forEach((m) => {
    paidMap[m.userId] = 0;
  });

  (bills || []).forEach((b) => {
    if (paidMap[b.paid_by] !== undefined) {
      paidMap[b.paid_by] += Number(b.amount || 0);
    }
  });

  const combinedTotalPaid = totalExpensesAmount + totalBillsAmount;

  const membersContribution = members.map((m) => {
    const paid = paidMap[m.userId] || 0;
    const percentage = combinedTotalPaid > 0 ? (paid / combinedTotalPaid) * 100 : 0;
    return {
      userId: m.userId,
      name: m.name,
      email: m.email,
      totalPaid: Number(paid.toFixed(2)),
      allocatedBalance: Number(m.allocatedBalance.toFixed(2)),
      percentage: Number(percentage.toFixed(1)),
    };
  });

  // Calculate category breakdown
  const categoryMap: Record<string, number> = {};
  (bills || []).forEach((b) => {
    const catName = b.name || b.type || (b.category === 'expense' ? 'Groceries' : 'Rent');
    categoryMap[catName] = (categoryMap[catName] || 0) + Number(b.amount || 0);
  });

  const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => {
    const percentage = combinedTotalPaid > 0 ? (amount / combinedTotalPaid) * 100 : 0;
    return {
      category,
      amount: Number(amount.toFixed(2)),
      percentage: Number(percentage.toFixed(1)),
    };
  }).sort((a, b) => b.amount - a.amount);

  // User balance from current open settlement period
  const userBalanceObj = (settlementData?.balances || []).find((b: any) => b.userId === userId);
  const userNetBalance = userBalanceObj ? Number(userBalanceObj.net) : 0;

  // Build Recent Activity Stream
  const activityList: RoomDashboardData['recentActivity'] = (bills || []).slice(0, 10).map((b: any) => ({
    id: b.id,
    type: b.category === 'expense' ? 'expense' : 'bill',
    title: b.name || b.type,
    amount: Number(b.amount || 0),
    paidByName:
      b.users?.name ||
      b.users?.email?.split('@')[0] ||
      members.find((m) => m.userId === b.paid_by)?.name ||
      'Member',
    date: b.created_at,
    category: b.category,
  }));

  const recentActivity = activityList.slice(0, 6);

  return {
    room: {
      id: room.id,
      name: room.name,
      inviteCode: (room as any).invite_code || (room as any).join_code || '',
      currency: (room as any).currency || 'Rs.',
      minBalanceRequired: Number((room as any).min_balance_required || 0),
      targetBudget: Number((room as any).target_budget || 0),
      createdAt: room.created_at,
    },
    stats: {
      totalExpensesAmount: Number(totalExpensesAmount.toFixed(2)),
      totalExpensesCount,
      totalBillsAmount: Number(totalBillsAmount.toFixed(2)),
      totalBillsCount,
      memberCount: members.length,
      userNetBalance,
      totalRoomPool: Number(totalRoomPool.toFixed(2)),
    },
    membersContribution,
    categoryBreakdown,
    recentActivity,
    settlementSummary: {
      transactionsCount: settlementData?.transactions?.length || 0,
      settled: (settlementData?.transactions?.length || 0) === 0,
    },
  };
}

