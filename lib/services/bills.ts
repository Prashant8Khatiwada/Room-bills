import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';
import { calculateEqualSplits } from './settlement';
import { recordAuditLog, listAuditLogs } from './auditLogs';

export interface CreateBillInput {
  category?: 'rent' | 'expense';
  type: 'rent' | 'electricity' | 'waste' | 'wifi' | 'expense' | string;
  name?: string;
  month?: string;
  amount?: number;
  prev_unit?: number;
  current_unit?: number;
  rate_per_unit?: number;
  quantity?: number;
  unit_price?: number;
  expense_date?: string;
  product_id?: string | null;
  is_fixed?: boolean;
  paid_by: string;
  split_among?: string[]; // Custom member IDs to split among (or custom shares map)
  custom_splits?: Record<string, number>; // Explicit share per user ID
  idempotency_key?: string;
}

export async function listBills(roomId: string, userId: string, periodId?: string, category?: 'rent' | 'expense') {
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

  let query = supabase
    .from('bills')
    .select('*, paid_by_user:users!paid_by(id, name, email), bill_splits(*)')
    .eq('room_id', roomId)
    .eq('period_id', targetPeriodId);

  if (category) {
    query = query.eq('category', category);
  }

  const { data: bills } = await query.order('created_at', { ascending: false });

  return bills || [];
}

export async function createBill(roomId: string, userId: string, data: CreateBillInput) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  // Handle Idempotency
  if (data.idempotency_key) {
    const { data: existing } = await supabase
      .from('bills')
      .select('*, bill_splits(*)')
      .eq('room_id', roomId)
      .eq('idempotency_key', data.idempotency_key)
      .single();

    if (existing) return existing;
  }

  // Resolve currently open period
  const { data: openPeriod } = await supabase
    .from('settlement_periods')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'open')
    .single();

  if (!openPeriod) {
    throw new Error('No open settlement period found for this room');
  }

  const category = data.category || 'rent';
  let finalAmount = data.amount || 0;

  // Handle Product catalog for fixed expenses if category is expense
  let finalProductId = data.product_id;
  if (category === 'expense' && data.is_fixed && data.name && !finalProductId) {
    const itemName = data.name.trim();
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('room_id', roomId)
      .ilike('name', itemName)
      .single();

    if (existingProduct) {
      finalProductId = existingProduct.id;
    } else {
      const { data: newProduct } = await supabase
        .from('products')
        .insert({
          room_id: roomId,
          name: itemName,
          default_price: data.unit_price || data.amount || 0,
        })
        .select()
        .single();

      finalProductId = newProduct?.id;
    }
  }

  if (category === 'expense' && data.quantity && data.unit_price) {
    finalAmount = Number((data.quantity * data.unit_price).toFixed(2));
  } else if (data.type === 'electricity') {
    if (data.prev_unit === undefined || data.current_unit === undefined || !data.rate_per_unit) {
      throw new Error('Electricity bill requires prev_unit, current_unit, and rate_per_unit');
    }
    if (data.current_unit < data.prev_unit) {
      throw new Error('Current unit must be greater than or equal to previous unit');
    }
    finalAmount = Number(((data.current_unit - data.prev_unit) * data.rate_per_unit).toFixed(2));
  }

  const billMonth = data.month || (data.expense_date ? data.expense_date.substring(0, 7) : new Date().toISOString().substring(0, 7));

  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      room_id: roomId,
      period_id: openPeriod.id,
      category,
      type: data.type,
      name: data.name,
      month: billMonth,
      prev_unit: data.prev_unit,
      current_unit: data.current_unit,
      rate_per_unit: data.rate_per_unit,
      quantity: data.quantity,
      unit_price: data.unit_price,
      expense_date: data.expense_date,
      product_id: finalProductId || null,
      amount: finalAmount,
      paid_by: data.paid_by,
      idempotency_key: data.idempotency_key,
    })
    .select()
    .single();

  if (billError || !bill) {
    throw new Error(`Failed to create bill: ${billError?.message}`);
  }

  let splits: Record<string, number> = {};

  if (data.custom_splits && Object.keys(data.custom_splits).length > 0) {
    // Explicit custom amount specified per member
    let otherSum = 0;
    Object.entries(data.custom_splits).forEach(([mId, share]) => {
      if (mId !== data.paid_by) {
        const val = Math.max(0, Number(share) || 0);
        splits[mId] = val;
        otherSum += val;
      }
    });
    // Payer pays the remaining amount (Total - Other Shares)
    splits[data.paid_by] = Number(Math.max(0, finalAmount - otherSum).toFixed(2));
  } else {
    // Fetch target members for splits calculation (always include payer in final calculation)
    let targetMemberIds: string[] = [];
    if (data.split_among && data.split_among.length > 0) {
      targetMemberIds = Array.from(new Set([...data.split_among, data.paid_by]));
    } else {
      const { data: members } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', roomId);
      targetMemberIds = members?.map((m) => m.user_id) || [data.paid_by];
    }
    splits = calculateEqualSplits(finalAmount, data.paid_by, targetMemberIds);
  }

  const splitRows = Object.entries(splits).map(([mId, share]) => ({
    bill_id: bill.id,
    user_id: mId,
    share,
  }));

  await supabase.from('bill_splits').insert(splitRows);

  // Record Audit Log for creation
  try {
    await recordAuditLog(roomId, userId, 'paid_bill', {
      title: data.name || data.type,
      amount: finalAmount,
      month: data.month,
    });
  } catch (err) {
    console.warn('[Bills] Audit log insert failed:', err);
  }

  return bill;
}

export async function deleteBill(roomId: string, billId: string, userId: string): Promise<void> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: bill, error } = await supabase
    .from('bills')
    .select('*, users:paid_by(id, name, email)')
    .eq('id', billId)
    .eq('room_id', roomId)
    .single();

  if (error || !bill) {
    throw new Error('Bill not found');
  }

  // Check if user is owner or paid_by
  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  const isOwner = member?.role === 'owner';
  const isPaidByMe = bill.paid_by === userId;

  if (!isOwner && !isPaidByMe) {
    throw new Error('Forbidden: You can only delete your own logged bills');
  }

  // Record Audit Log for deletion before removing record
  try {
    await recordAuditLog(roomId, userId, 'deleted_bill', {
      title: bill.name || bill.type,
      amount: bill.amount,
      month: bill.month,
    });
  } catch (err) {
    console.warn('[Bills] Audit log deletion insert failed:', err);
  }

  // Delete splits first, then bill
  await supabase.from('bill_splits').delete().eq('bill_id', billId);
  await supabase.from('bills').delete().eq('id', billId).eq('room_id', roomId);
}

export async function listBillLogs(roomId: string, userId: string) {
  return listAuditLogs(roomId, userId);
}
