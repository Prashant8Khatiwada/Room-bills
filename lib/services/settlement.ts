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

  const { data: openPeriod } = await supabase
    .from('settlement_periods')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'open')
    .single();

  if (!openPeriod) {
    return { period: null, balances: [], transactions: [] };
  }

  const { data: members } = await supabase
    .from('room_members')
    .select('user_id, users(id, name, email)')
    .eq('room_id', roomId);

  const { data: bills } = await supabase
    .from('bills')
    .select('amount, paid_by, bill_splits(*)')
    .eq('room_id', roomId)
    .eq('period_id', openPeriod.id);

  // Compute net balance per member
  const memberBalancesMap: Record<string, { paid: number; owed: number; user: any }> = {};

  members?.forEach((m) => {
    memberBalancesMap[m.user_id] = { paid: 0, owed: 0, user: m.users };
  });

  bills?.forEach((b) => {
    if (memberBalancesMap[b.paid_by]) {
      memberBalancesMap[b.paid_by].paid += Number(b.amount);
    }
    b.bill_splits?.forEach((s: any) => {
      if (memberBalancesMap[s.user_id]) {
        memberBalancesMap[s.user_id].owed += Number(s.share);
      }
    });
  });

  const balancesList = Object.entries(memberBalancesMap).map(([uId, item]) => {
    const net = Number((item.paid - item.owed).toFixed(2));
    return {
      userId: uId,
      name: item.user?.name || 'Unknown',
      email: item.user?.email || '',
      paid: Number(item.paid.toFixed(2)),
      owed: Number(item.owed.toFixed(2)),
      net,
    };
  });

  const transactions = simplifyDebts(
    balancesList.map((b) => ({ userId: b.userId, amount: b.net }))
  );

  return {
    period: openPeriod,
    balances: balancesList,
    transactions,
  };
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

  const { error } = await supabase.rpc('close_settlement_period', { p_room_id: roomId });

  if (error) {
    throw new Error(`Failed to close settlement period: ${error.message}`);
  }
}

