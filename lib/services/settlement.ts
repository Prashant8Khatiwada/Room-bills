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
