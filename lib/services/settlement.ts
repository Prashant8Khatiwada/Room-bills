export interface Balance {
  userId: string;
  amount: number; // positive = owed money (creditor), negative = owes money (debtor)
}

export interface SettlementTransaction {
  from: string; // debtor
  to: string;   // creditor
  amount: number;
}

export function simplifyDebts(balances: Balance[]): SettlementTransaction[] {
  // Floating point safety: filter out negligible balances (< 0.01)
  const creditors = balances
    .filter((b) => b.amount >= 0.01)
    .map((b) => ({ ...b, amount: Number(b.amount.toFixed(2)) }));

  const debtors = balances
    .filter((b) => b.amount <= -0.01)
    .map((b) => ({ ...b, amount: Number(Math.abs(b.amount).toFixed(2)) }));

  // Deterministic sorting: sort by amount descending, then userId ascending
  creditors.sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));
  debtors.sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));

  const transactions: SettlementTransaction[] = [];

  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Number(Math.min(debtor.amount, creditor.amount).toFixed(2));

    if (settledAmount >= 0.01) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: settledAmount,
      });

      debtor.amount = Number((debtor.amount - settledAmount).toFixed(2));
      creditor.amount = Number((creditor.amount - settledAmount).toFixed(2));
    }

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return transactions;
}

export function calculateEqualSplits(
  totalAmount: number,
  payerId: string,
  memberIds: string[]
): Record<string, number> {
  if (memberIds.length === 0) return {};

  const totalCents = Math.round(totalAmount * 100);
  const baseShareCents = Math.floor(totalCents / memberIds.length);
  const remainderCents = totalCents % memberIds.length;

  const splits: Record<string, number> = {};

  for (const memberId of memberIds) {
    splits[memberId] = baseShareCents / 100;
  }

  // Remainder paisa goes to the payer
  if (remainderCents > 0 && memberIds.includes(payerId)) {
    splits[payerId] = Number(((splits[payerId] * 100 + remainderCents) / 100).toFixed(2));
  }

  return splits;
}

export async function getCurrentSettlement(roomId: string, userId: string) {
  const { assertRoomMember } = await import('./rooms');
  const { createClient } = await import('@/lib/supabase/server');

  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  // Fetch room settings
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  const currency = (room as any)?.currency || 'Rs.';

  const { data: openPeriod } = await supabase
    .from('settlement_periods')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'open')
    .maybeSingle();

  if (!openPeriod) {
    return {
      room: {
        ...(room || {}),
        currency,
      },
      period: null,
      balances: [],
      transactions: [],
      itemizedBills: [],
      totalExpenses: 0,
      steps: [],
    };
  }

  const { data: members } = await supabase
    .from('room_members')
    .select('user_id, role, users(id, name, email, avatar_url)')
    .eq('room_id', roomId);

  let bills: any[] = [];
  try {
    const { data: billsData, error: billsErr } = await supabase
      .from('bills')
      .select('*, bill_splits(*), users!paid_by(id, name, email)')
      .eq('room_id', roomId)
      .eq('period_id', openPeriod.id)
      .order('created_at', { ascending: false });

    if (billsErr) {
      const { data: fallbackBills } = await supabase
        .from('bills')
        .select('*, bill_splits(*)')
        .eq('room_id', roomId)
        .eq('period_id', openPeriod.id);
      bills = fallbackBills || [];
    } else {
      bills = billsData || [];
    }
  } catch {
    bills = [];
  }

  // Compute net balance per member
  const memberBalancesMap: Record<string, { paid: number; owed: number; user: any; role: string }> = {};

  members?.forEach((m) => {
    memberBalancesMap[m.user_id] = { paid: 0, owed: 0, user: m.users, role: m.role };
  });

  let totalExpenses = 0;
  bills?.forEach((b) => {
    const amt = Number(b.amount || 0);
    totalExpenses += amt;
    if (memberBalancesMap[b.paid_by]) {
      memberBalancesMap[b.paid_by].paid += amt;
    }
    b.bill_splits?.forEach((s: any) => {
      if (memberBalancesMap[s.user_id]) {
        memberBalancesMap[s.user_id].owed += Number(s.share || 0);
      }
    });
  });

  const balancesList = Object.entries(memberBalancesMap).map(([uId, item]) => {
    const net = Number((item.paid - item.owed).toFixed(2));
    return {
      userId: uId,
      name: item.user?.name || 'Unknown',
      email: item.user?.email || '',
      role: item.role,
      paid: Number(item.paid.toFixed(2)),
      owed: Number(item.owed.toFixed(2)),
      net,
    };
  });

  const transactions = simplifyDebts(
    balancesList.map((b) => ({ userId: b.userId, amount: b.net }))
  );

  // Generate step-by-step mathematical derivation for transparency
  const steps: string[] = [];
  steps.push(`Total Room Expenditure for period: ${currency} ${totalExpenses.toFixed(2)}.`);
  balancesList.forEach((b) => {
    steps.push(
      `${b.name} paid ${currency} ${b.paid.toFixed(2)} and owes ${currency} ${b.owed.toFixed(
        2
      )} fair share. Net balance: ${b.net >= 0 ? '+' : ''}${currency} ${b.net.toFixed(2)}.`
    );
  });
  if (transactions.length === 0) {
    steps.push('All net balances sum to 0. No debt settlement payments required.');
  } else {
    transactions.forEach((t) => {
      const debtor = balancesList.find((b) => b.userId === t.from)?.name || 'Member';
      const creditor = balancesList.find((b) => b.userId === t.to)?.name || 'Member';
      steps.push(`${debtor} pays ${creditor} ${currency} ${t.amount.toFixed(2)}.`);
    });
  }

  return {
    room: {
      ...room,
      currency,
    },
    period: openPeriod,
    balances: balancesList,
    transactions,
    itemizedBills: bills || [],
    totalExpenses: Number(totalExpenses.toFixed(2)),
    steps,
  };
}

export async function getSettlementHistory(roomId: string, userId: string) {
  const { assertRoomMember } = await import('./rooms');
  const { createClient } = await import('@/lib/supabase/server');

  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: periods } = await supabase
    .from('settlement_periods')
    .select('*, bills(id, amount, paid_by, bill_splits(*))')
    .eq('room_id', roomId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false });

  const { data: members } = await supabase
    .from('room_members')
    .select('user_id, users(id, name, email)')
    .eq('room_id', roomId);

  const history = periods?.map((p: any) => {
    let totalAmt = 0;
    const balancesMap: Record<string, { paid: number; owed: number; user: any }> = {};
    members?.forEach((m) => {
      balancesMap[m.user_id] = { paid: 0, owed: 0, user: m.users };
    });

    p.bills?.forEach((b: any) => {
      const amt = Number(b.amount || 0);
      totalAmt += amt;
      if (balancesMap[b.paid_by]) {
        balancesMap[b.paid_by].paid += amt;
      }
      b.bill_splits?.forEach((s: any) => {
        if (balancesMap[s.user_id]) {
          balancesMap[s.user_id].owed += Number(s.share || 0);
        }
      });
    });

    const balances = Object.entries(balancesMap).map(([uId, item]) => ({
      userId: uId,
      name: item.user?.name || 'Member',
      paid: Number(item.paid.toFixed(2)),
      owed: Number(item.owed.toFixed(2)),
      net: Number((item.paid - item.owed).toFixed(2)),
    }));

    const txs = simplifyDebts(balances.map((b) => ({ userId: b.userId, amount: b.net })));

    return {
      id: p.id,
      status: p.status,
      closed_at: p.closed_at,
      created_at: p.created_at,
      start_date: p.start_date,
      end_date: p.end_date,
      totalExpenses: Number(totalAmt.toFixed(2)),
      balances,
      transactions: txs,
      billCount: p.bills?.length || 0,
    };
  });

  return history || [];
}

export async function closeSettlementPeriodService(roomId: string, userId: string) {
  const { assertRoomMember } = await import('./rooms');
  const { createClient } = await import('@/lib/supabase/server');

  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (member?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can close a settlement period');
  }

  // Fetch current room settings for recurring schedule
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  // Try database RPC first if exists
  const { error: rpcError } = await supabase.rpc('close_settlement_period', { p_room_id: roomId });

  if (rpcError) {
    // Manual fallback close & open new period logic
    const { data: currentOpen } = await supabase
      .from('settlement_periods')
      .select('id')
      .eq('room_id', roomId)
      .eq('status', 'open')
      .single();

    if (currentOpen) {
      await supabase
        .from('settlement_periods')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', currentOpen.id);
    }

    const today = new Date();
    const startDay = room?.recurring_settlement_day || 1;
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, startDay);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 2, startDay - 1);

    await supabase.from('settlement_periods').insert({
      room_id: roomId,
      status: 'open',
      start_date: today.toISOString().split('T')[0],
      end_date: periodEnd.toISOString().split('T')[0],
    });
  }
}


