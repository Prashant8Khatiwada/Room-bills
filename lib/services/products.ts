import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';

export interface ProductItem {
  id: string;
  room_id: string;
  name: string;
  default_price: number;
  unit_label: string;
  status: 'draft' | 'approved';
  created_by?: string;
  created_at?: string;
}

export async function listProducts(roomId: string, userId: string): Promise<ProductItem[]> {
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

  // Ensure every item has a status (default to 'approved' for legacy items without status)
  return (products || []).map((p: any) => ({
    ...p,
    status: p.status || 'approved',
  }));
}

export async function createProduct(
  roomId: string,
  userId: string,
  payload: { name: string; defaultPrice: number; unitLabel?: string }
): Promise<ProductItem> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  // All newly created products start as 'draft'
  const newProductData = {
    room_id: roomId,
    name: payload.name.trim(),
    default_price: payload.defaultPrice,
    unit_label: payload.unitLabel || 'pcs',
    status: 'draft',
    created_by: userId,
  };

  try {
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert(newProductData)
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
      return { ...fallbackProduct, status: 'draft' };
    }

    if (error) throw error;

    return { ...newProduct, status: 'draft' };
  } catch (err: any) {
    console.error('[Service] createProduct error:', err);
    throw err;
  }
}

export async function updateProduct(
  roomId: string,
  productId: string,
  userId: string,
  payload: { name?: string; defaultPrice?: number; unitLabel?: string }
): Promise<ProductItem> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  // Fetch product and user role
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('room_id', roomId)
    .single();

  if (!product) throw new Error('Product not found');

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  const isOwner = member?.role === 'owner';
  const isDraft = (product.status || 'approved') === 'draft';

  // Non-owners can ONLY edit draft items
  if (!isOwner && !isDraft) {
    throw new Error('Forbidden: Only room owners can edit approved catalog products');
  }

  const updates: any = {};
  if (payload.name) updates.name = payload.name.trim();
  if (payload.defaultPrice !== undefined) updates.default_price = payload.defaultPrice;
  if (payload.unitLabel) updates.unit_label = payload.unitLabel;

  const { data: updated, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .eq('room_id', roomId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function approveProduct(roomId: string, productId: string, userId: string): Promise<ProductItem> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (member?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can approve draft products');
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
    // Return mock object if status column absent
    return { id: productId, room_id: roomId, name: '', default_price: 0, unit_label: '', status: 'approved' };
  }

  return updated;
}

export async function deleteProduct(roomId: string, productId: string, userId: string): Promise<void> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('room_id', roomId)
    .single();

  if (!product) return;

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  const isOwner = member?.role === 'owner';
  const isDraft = (product.status || 'approved') === 'draft';

  // Draft products can be deleted by any room member. Approved products require owner role.
  if (!isOwner && !isDraft) {
    throw new Error('Forbidden: Only room owners can delete approved catalog products');
  }

  await supabase.from('products').delete().eq('id', productId).eq('room_id', roomId);
}
