import { listBills, createBill, deleteBill } from './bills';

export async function listExpenses(roomId: string, userId: string, periodId?: string) {
  return listBills(roomId, userId, periodId, 'expense');
}

export async function createExpense(roomId: string, userId: string, data: any) {
  return createBill(roomId, userId, {
    category: 'expense',
    type: 'expense',
    name: data.item_name || data.name,
    amount: data.total_amount || data.amount,
    quantity: data.quantity,
    unit_price: data.unit_price,
    paid_by: data.paid_by,
    expense_date: data.expense_date,
    product_id: data.product_id,
    idempotency_key: data.idempotency_key,
    custom_splits: data.splits?.reduce((acc: any, s: any) => {
      acc[s.user_id] = s.share;
      return acc;
    }, {}),
  });
}

export async function deleteExpense(roomId: string, expenseId: string, userId: string) {
  return deleteBill(roomId, expenseId, userId);
}
