import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from '@/lib/services/rooms';
import { getCurrentSettlement } from '@/lib/services/settlement';

export interface RoomDashboardData {
  room: {
    id: string;
    name: string;
    inviteCode: string;
    createdAt: string;
  };
  stats: {
    totalExpensesAmount: number;
    totalExpensesCount: number;
    totalBillsAmount: number;
    totalBillsCount: number;
    memberCount: number;
    userNetBalance: number; // positive = user is owed, negative = user owes
  };
  membersContribution: Array<{
    userId: string;
    name: string;
    email: string;
    totalPaid: number;
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

  // 1. Room info
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, invite_code, created_at')
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    throw new Error('Room not found');
  }

  // 2. Members info
  const { data: membersData } = await supabase
    .from('room_members')
    .select('user_id, role, users(id, name, email)')
    .eq('room_id', roomId);

  const members = (membersData || []).map((m: any) => ({
    userId: m.user_id,
    name: m.users?.name || m.users?.email?.split('@')[0] || 'Member',
    email: m.users?.email || '',
  }));

  // 3. Bills & Expenses (All recorded in bills table)
  const { data: bills } = await supabase
    .from('bills')
    .select('id, name, amount, category, type, paid_by, created_at, users:paid_by(name, email)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  // 4. Settlement information
  const settlementData = await getCurrentSettlement(roomId, userId);

  const rentBills = (bills || []).filter((b) => (b.category || 'rent') === 'rent');
  const expenseBills = (bills || []).filter((b) => b.category === 'expense');

  const totalBillsAmount = rentBills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const totalBillsCount = rentBills.length;

  const totalExpensesAmount = expenseBills.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalExpensesCount = expenseBills.length;

  // Calculate member contributions (total paid by member across all bills)
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
  const userBalanceObj = settlementData.balances.find((b: any) => b.userId === userId);
  const userNetBalance = userBalanceObj ? Number(userBalanceObj.net) : 0;

  // Build Recent Activity Stream
  const activityList: RoomDashboardData['recentActivity'] = (bills || []).slice(0, 10).map((b: any) => ({
    id: b.id,
    type: b.category === 'expense' ? 'expense' : 'bill',
    title: b.name || b.type,
    amount: Number(b.amount),
    paidByName: b.users?.name || b.users?.email?.split('@')[0] || 'Member',
    date: b.created_at,
    category: b.category,
  }));

  const recentActivity = activityList.slice(0, 6);

  return {
    room: {
      id: room.id,
      name: room.name,
      inviteCode: room.invite_code,
      createdAt: room.created_at,
    },
    stats: {
      totalExpensesAmount: Number(totalExpensesAmount.toFixed(2)),
      totalExpensesCount,
      totalBillsAmount: Number(totalBillsAmount.toFixed(2)),
      totalBillsCount,
      memberCount: members.length,
      userNetBalance,
    },
    membersContribution,
    categoryBreakdown,
    recentActivity,
    settlementSummary: {
      transactionsCount: settlementData.transactions.length,
      settled: settlementData.transactions.length === 0,
    },
  };
}
