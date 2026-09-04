import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';

export async function listProducts(roomId: string, userId: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('room_id', roomId)
    .order('name', { ascending: true });

  return products || [];
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
