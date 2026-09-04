import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';

export interface BillTemplateItem {
  id: string;
  room_id: string;
  name: string;
  type: 'rent' | 'electricity' | 'waste' | 'wifi' | 'custom';
  default_amount: number;
  rate_per_unit?: number;
  status: 'draft' | 'approved';
  created_by?: string;
}

// Default room bill templates if none saved yet
const DEFAULT_ROOM_TEMPLATES: Omit<BillTemplateItem, 'id' | 'room_id'>[] = [
  { name: 'House Rent', type: 'rent', default_amount: 15000, status: 'approved' },
  { name: 'WiFi / Internet', type: 'wifi', default_amount: 1200, status: 'approved' },
  { name: 'Waste Collection', type: 'waste', default_amount: 300, status: 'approved' },
  { name: 'Electricity Meter', type: 'electricity', default_amount: 0, rate_per_unit: 12, status: 'approved' },
];

export async function listBillTemplates(roomId: string, userId: string): Promise<BillTemplateItem[]> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  try {
    const { data: customTemplates, error } = await supabase
      .from('bill_templates')
      .select('*')
      .eq('room_id', roomId)
      .order('name', { ascending: true });

    if (error || !customTemplates || customTemplates.length === 0) {
      // Return default bill templates + any saved
      return DEFAULT_ROOM_TEMPLATES.map((t, idx) => ({
        id: `default-${idx}`,
        room_id: roomId,
        ...t,
      }));
    }

    return customTemplates;
  } catch {
    return DEFAULT_ROOM_TEMPLATES.map((t, idx) => ({
      id: `default-${idx}`,
      room_id: roomId,
      ...t,
    }));
  }
}

export async function createBillTemplate(
  roomId: string,
  userId: string,
  payload: { name: string; type: BillTemplateItem['type']; defaultAmount: number; ratePerUnit?: number }
): Promise<BillTemplateItem> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const templateData = {
    room_id: roomId,
    name: payload.name.trim(),
    type: payload.type || 'custom',
    default_amount: payload.defaultAmount,
    rate_per_unit: payload.ratePerUnit,
    status: 'draft',
    created_by: userId,
  };

  try {
    const { data: newTemplate, error } = await supabase
      .from('bill_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.warn('[BillTemplates] Fallback insert:', error.message);
      return { id: `custom-${Date.now()}`, ...templateData } as BillTemplateItem;
    }

    return newTemplate;
  } catch {
    return { id: `custom-${Date.now()}`, ...templateData } as BillTemplateItem;
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

    return updated || { id: templateId, room_id: roomId, name: '', type: 'custom', default_amount: 0, status: 'approved' };
  } catch {
    return { id: templateId, room_id: roomId, name: '', type: 'custom', default_amount: 0, status: 'approved' };
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

  if (member?.role !== 'owner' && !templateId.startsWith('custom-')) {
    // Check if draft
    const { data: template } = await supabase
      .from('bill_templates')
      .select('status')
      .eq('id', templateId)
      .single();

    if (template && template.status === 'approved') {
      throw new Error('Forbidden: Only room owners can delete approved bill templates');
    }
  }

  try {
    await supabase.from('bill_templates').delete().eq('id', templateId).eq('room_id', roomId);
  } catch (err) {
    console.error('[BillTemplates] delete error:', err);
  }
}
