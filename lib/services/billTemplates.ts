import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';
import { recordAuditLog } from './auditLogs';

export interface BillTemplateItem {
  id: string;
  room_id: string;
  name: string;
  category: 'fixed' | 'quantity' | 'metered';
  bill_category?: 'rent' | 'expense';
  type?: 'rent' | 'electricity' | 'waste' | 'wifi' | 'expense' | 'custom';
  default_amount: number;
  rate_per_unit?: number;
  status: 'draft' | 'approved';
  created_by?: string;
}

// Default room bill templates if none saved yet
const DEFAULT_ROOM_TEMPLATES: Omit<BillTemplateItem, 'id' | 'room_id'>[] = [
  { name: 'House Rent', category: 'fixed', bill_category: 'rent', type: 'rent', default_amount: 15000, status: 'approved' },
  { name: 'WiFi / Internet', category: 'fixed', bill_category: 'rent', type: 'wifi', default_amount: 1200, status: 'approved' },
  { name: 'Waste Collection', category: 'fixed', bill_category: 'rent', type: 'waste', default_amount: 300, status: 'approved' },
  { name: 'Electricity Meter', category: 'metered', bill_category: 'rent', type: 'electricity', default_amount: 0, rate_per_unit: 12, status: 'approved' },
  { name: 'Groceries', category: 'quantity', bill_category: 'expense', type: 'expense', default_amount: 0, status: 'approved' },
  { name: 'Vegetables', category: 'quantity', bill_category: 'expense', type: 'expense', default_amount: 0, status: 'approved' },
];

export async function listBillTemplates(roomId: string, userId: string, billCategory?: 'rent' | 'expense'): Promise<BillTemplateItem[]> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  try {
    let query = supabase
      .from('bill_templates')
      .select('*')
      .eq('room_id', roomId);

    if (billCategory) {
      query = query.eq('bill_category', billCategory);
    }

    const { data: existingTemplates, error } = await query.order('created_at', { ascending: true });

    if (!error && existingTemplates && existingTemplates.length > 0) {
      return existingTemplates.map((t) => ({
        ...t,
        category: t.category || (t.type === 'electricity' || t.rate_per_unit ? 'metered' : 'fixed'),
        bill_category: t.bill_category || 'rent',
      }));
    }

    // Seed default room templates into DB if none exist yet
    const seedPayloads = DEFAULT_ROOM_TEMPLATES.map((t) => ({
      room_id: roomId,
      name: t.name,
      category: t.category,
      bill_category: t.bill_category || 'rent',
      type: t.type,
      default_amount: t.default_amount,
      rate_per_unit: t.rate_per_unit,
      status: 'approved',
      created_by: userId,
    }));

    const { data: seeded, error: seedError } = await supabase
      .from('bill_templates')
      .insert(seedPayloads)
      .select();

    if (!seedError && seeded && seeded.length > 0) {
      const filtered = billCategory ? seeded.filter((t) => (t.bill_category || 'rent') === billCategory) : seeded;
      return filtered.map((t) => ({
        ...t,
        category: t.category || (t.type === 'electricity' || t.rate_per_unit ? 'metered' : 'fixed'),
        bill_category: t.bill_category || 'rent',
      }));
    }

    // Fallback if DB table insert unavailable
    const fallbackList = DEFAULT_ROOM_TEMPLATES.filter((t) => !billCategory || (t.bill_category || 'rent') === billCategory);
    return fallbackList.map((t, idx) => ({
      id: `seeded-${idx}-${Date.now()}`,
      room_id: roomId,
      ...t,
    }));
  } catch {
    const fallbackList = DEFAULT_ROOM_TEMPLATES.filter((t) => !billCategory || (t.bill_category || 'rent') === billCategory);
    return fallbackList.map((t, idx) => ({
      id: `seeded-${idx}-${Date.now()}`,
      room_id: roomId,
      ...t,
    }));
  }
}

export async function createBillTemplate(
  roomId: string,
  userId: string,
  payload: { name: string; category: 'fixed' | 'quantity' | 'metered'; billCategory?: 'rent' | 'expense'; defaultAmount?: number; ratePerUnit?: number; type?: string }
): Promise<BillTemplateItem> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const isMetered = payload.category === 'metered';
  const templateData = {
    room_id: roomId,
    name: payload.name.trim(),
    category: payload.category,
    bill_category: payload.billCategory || 'rent',
    type: payload.type || (isMetered ? 'electricity' : 'custom'),
    default_amount: isMetered ? 0 : Number(payload.defaultAmount || 0),
    rate_per_unit: isMetered ? Number(payload.ratePerUnit || 12) : undefined,
    status: 'draft',
    created_by: userId,
  };

  try {
    const { data: newTemplate, error } = await supabase
      .from('bill_templates')
      .insert(templateData)
      .select()
      .single();

    try {
      await recordAuditLog(roomId, userId, 'created_template', {
        title: templateData.name,
        amount: templateData.default_amount || templateData.rate_per_unit,
      });
    } catch {}

    if (error) {
      console.warn('[BillTemplates] Fallback insert:', error.message);
      return { id: `custom-${Date.now()}`, ...templateData } as BillTemplateItem;
    }

    return newTemplate;
  } catch {
    return { id: `custom-${Date.now()}`, ...templateData } as BillTemplateItem;
  }
}

export async function updateBillTemplate(
  roomId: string,
  templateId: string,
  userId: string,
  payload: { name?: string; category?: 'fixed' | 'quantity' | 'metered'; billCategory?: 'rent' | 'expense'; defaultAmount?: number; ratePerUnit?: number }
): Promise<BillTemplateItem> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const isMetered = payload.category === 'metered';
  const updateData: any = {};
  if (payload.name) updateData.name = payload.name.trim();
  if (payload.category) updateData.category = payload.category;
  if (payload.category) updateData.type = isMetered ? 'electricity' : 'custom';
  if (payload.defaultAmount !== undefined) updateData.default_amount = isMetered ? 0 : Number(payload.defaultAmount);
  if (payload.ratePerUnit !== undefined) updateData.rate_per_unit = isMetered ? Number(payload.ratePerUnit) : undefined;

  try {
    const { data: updated, error } = await supabase
      .from('bill_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('room_id', roomId)
      .select()
      .single();

    if (error) {
      console.warn('[BillTemplates] update error:', error.message);
      return { id: templateId, room_id: roomId, name: payload.name || '', category: payload.category || 'fixed', default_amount: payload.defaultAmount || 0, status: 'approved' };
    }

    return updated;
  } catch {
    return { id: templateId, room_id: roomId, name: payload.name || '', category: payload.category || 'fixed', default_amount: payload.defaultAmount || 0, status: 'approved' };
  }
}

export async function approveBillTemplate(roomId: string, templateId: string, userId: string): Promise<BillTemplateItem> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (member?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can approve draft bill templates');
  }

  try {
    const { data: updated } = await supabase
      .from('bill_templates')
      .update({ status: 'approved' })
      .eq('id', templateId)
      .eq('room_id', roomId)
      .select()
      .single();

    try {
      await recordAuditLog(roomId, userId, 'approved_template', {
        title: updated?.name || 'Bill Template',
        amount: updated?.default_amount || updated?.rate_per_unit,
      });
    } catch {}

    return updated || { id: templateId, room_id: roomId, name: '', category: 'fixed', type: 'custom', default_amount: 0, status: 'approved' };
  } catch {
    return { id: templateId, room_id: roomId, name: '', category: 'fixed', type: 'custom', default_amount: 0, status: 'approved' };
  }
}

export async function deleteBillTemplate(roomId: string, templateId: string, userId: string): Promise<void> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  const { data: template } = await supabase
    .from('bill_templates')
    .select('name, default_amount, rate_per_unit, status')
    .eq('id', templateId)
    .single();

  if (member?.role !== 'owner' && !templateId.startsWith('custom-')) {
    if (template && template.status === 'approved') {
      throw new Error('Forbidden: Only room owners can delete approved bill templates');
    }
  }

  try {
    await recordAuditLog(roomId, userId, 'deleted_template', {
      title: template?.name || 'Bill Template',
      amount: template?.default_amount || template?.rate_per_unit,
    });
  } catch {}

  try {
    await supabase.from('bill_templates').delete().eq('id', templateId).eq('room_id', roomId);
  } catch (err) {
    console.error('[BillTemplates] delete error:', err);
  }
}
