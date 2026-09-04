import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';
import { calculateEqualSplits } from './settlement';

export interface CreateBillInput {
  type: 'rent' | 'electricity' | 'waste' | 'wifi';
  month: string;
  amount?: number;
  prev_unit?: number;
  current_unit?: number;
  rate_per_unit?: number;
  paid_by: string;
  idempotency_key?: string;
}

export async function listBills(roomId: string, userId: string, periodId?: string) {
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

  const { data: bills } = await supabase
    .from('bills')
    .select('*, paid_by_user:users!paid_by(id, name, email), bill_splits(*)')
    .eq('room_id', roomId)
    .eq('period_id', targetPeriodId)
    .order('created_at', { ascending: false });

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

  let finalAmount = data.amount || 0;

  // Server-side calculation for electricity
  if (data.type === 'electricity') {
    if (data.prev_unit === undefined || data.current_unit === undefined || !data.rate_per_unit) {
      throw new Error('Electricity bill requires prev_unit, current_unit, and rate_per_unit');
    }
    if (data.current_unit < data.prev_unit) {
      throw new Error('Current unit must be greater than or equal to previous unit');
    }
    finalAmount = Number(((data.current_unit - data.prev_unit) * data.rate_per_unit).toFixed(2));
  }

  const { data: bill, error: billError } = await supabase
    .from('bills')
    .insert({
      room_id: roomId,
      period_id: openPeriod.id,
      type: data.type,
      month: data.month,
      prev_unit: data.prev_unit,
      current_unit: data.current_unit,
      rate_per_unit: data.rate_per_unit,
      amount: finalAmount,
      paid_by: data.paid_by,
      idempotency_key: data.idempotency_key,
    })
    .select()
    .single();

  if (billError || !bill) {
    throw new Error(`Failed to create bill: ${billError?.message}`);
  }

  // Fetch current members to calculate splits
  const { data: members } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId);

  const memberIds = members?.map((m) => m.user_id) || [data.paid_by];
  const splits = calculateEqualSplits(finalAmount, data.paid_by, memberIds);

  const splitRows = Object.entries(splits).map(([mId, share]) => ({
    bill_id: bill.id,
    user_id: mId,
    share,
  }));

  await supabase.from('bill_splits').insert(splitRows);

  return bill;
}
