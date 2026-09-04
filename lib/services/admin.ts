import { createAdminClient } from '@/lib/supabase/admin';

export async function assertPlatformAdmin(userId: string) {
  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', userId)
    .single();

  if (!user?.is_platform_admin) {
    throw new Error('Forbidden: Platform admin access required');
  }
}

export async function listAdminUsers(search?: string) {
  const supabase = createAdminClient();
  let query = supabase.from('users').select('*').order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: users, error } = await query;
  if (error) throw new Error(error.message);
  return users || [];
}

export async function setUserDisabled(targetUserId: string, disabled: boolean, currentAdminId: string) {
  if (targetUserId === currentAdminId) {
    throw new Error('Cannot disable your own platform admin account');
  }

  const supabase = createAdminClient();
  const { data: targetUser } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', targetUserId)
    .single();

  if (targetUser?.is_platform_admin) {
    throw new Error('Cannot disable another platform admin account');
  }

  const { error } = await supabase.auth.admin.updateUserById(targetUserId, {
    ban_duration: disabled ? '876000h' : 'none', // 100 years or unban
  });

  if (error) throw new Error(`Failed to update user ban status: ${error.message}`);
  console.log(`[ADMIN] User ${targetUserId} disabled state set to ${disabled} by admin ${currentAdminId}`);
}

export async function listAdminRooms(search?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from('rooms')
    .select('*, created_by_user:users!created_by(id, name, email), room_members(count)')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data: rooms, error } = await query;
  if (error) throw new Error(error.message);
  return rooms || [];
}

export async function forceDeleteRoom(roomId: string, adminUserId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('rooms').delete().eq('id', roomId);
  if (error) throw new Error(`Failed to delete room: ${error.message}`);
  console.log('[ADMIN] Room force-deleted', { roomId, adminUserId });
}

export async function getPlatformStats() {
  const supabase = createAdminClient();

  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: totalRooms } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
  const { count: totalExpenses } = await supabase.from('expenses').select('*', { count: 'exact', head: true });

  return {
    totalUsers: totalUsers || 0,
    totalRooms: totalRooms || 0,
    totalExpenses: totalExpenses || 0,
  };
}
