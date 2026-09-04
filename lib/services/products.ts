import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';

export async function listProducts(roomId: string, userId: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('room_id', roomId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[Service] listProducts error:', error);
    return [];
  }

  return products || [];
}

export async function createProduct(
  roomId: string,
  userId: string,
  payload: { name: string; defaultPrice: number; unitLabel?: string }
) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  const isOwner = member?.role === 'owner';
  const status = isOwner ? 'approved' : 'pending';

  // Check if product with same name already exists in room
  const { data: existing } = await supabase
    .from('products')
    .select('*')
    .eq('room_id', roomId)
    .ilike('name', payload.name.trim())
    .single();

  if (existing) {
    return existing;
  }

  // Attempt insert with status, fallback without if column not present
  try {
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        room_id: roomId,
        name: payload.name.trim(),
        default_price: payload.defaultPrice,
        unit_label: payload.unitLabel || 'pcs',
        status: status,
      })
      .select()
      .single();

    if (error && error.message?.includes('status')) {
      // Fallback if status column is absent in db schema
      const { data: fallbackProduct } = await supabase
        .from('products')
        .insert({
          room_id: roomId,
          name: payload.name.trim(),
          default_price: payload.defaultPrice,
          unit_label: payload.unitLabel || 'pcs',
        })
        .select()
        .single();
      return fallbackProduct;
    }

    return newProduct;
  } catch (err: any) {
    console.error('[Service] createProduct error:', err);
    throw err;
  }
}

export async function approveProduct(roomId: string, productId: string, userId: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (member?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can approve product catalog items');
  }

  const { data: updated, error } = await supabase
    .from('products')
    .update({ status: 'approved' })
    .eq('id', productId)
    .eq('room_id', roomId)
    .select()
    .single();

  if (error) {
    console.error('[Service] approveProduct error:', error);
  }

  return updated;
}

export async function deleteProduct(roomId: string, productId: string, userId: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (member?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can delete products from the catalog');
  }

  await supabase.from('products').delete().eq('id', productId).eq('room_id', roomId);
}
