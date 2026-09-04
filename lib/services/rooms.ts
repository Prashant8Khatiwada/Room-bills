import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes 0, O, 1, I
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function assertRoomMember(roomId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (!member) {
    throw new Error('Unauthorized: Not a member of this room');
  }
}

// Uses service-role admin client to bypass RLS and sync the user row into public.users
async function ensureUserExists(userId: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin.from('users').select('id').eq('id', userId).single();
  if (!existing) {
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    if (user) {
      await admin.from('users').upsert({
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      }, { onConflict: 'id' });
    }
  }
}

export async function createRoom(
  userId: string,
  name: string,
  minBalanceRequired: number = 0
) {
  const supabase = await createClient();
  await ensureUserExists(userId);
  let inviteCode = generateInviteCode();

  // Retry logic on collision
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 5) {
    const { data: existing } = await supabase
      .from('rooms')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (!existing) {
      isUnique = true;
    } else {
      inviteCode = generateInviteCode();
      attempts++;
    }
  }

  // Insert room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      name,
      invite_code: inviteCode,
      created_by: userId,
      min_balance_required: Math.max(0, minBalanceRequired),
    })
    .select()
    .single();

  if (roomError || !room) {
    throw new Error(`Failed to create room: ${roomError?.message}`);
  }

  // Insert owner membership with initial allocation equal to min_balance_required or 0
  await supabase.from('room_members').insert({
    room_id: room.id,
    user_id: userId,
    role: 'owner',
    allocated_balance: Math.max(0, minBalanceRequired),
  });

  // Auto-open first settlement period
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

  await supabase.from('settlement_periods').insert({
    room_id: room.id,
    start_date: today.toISOString().split('T')[0],
    end_date: nextMonth.toISOString().split('T')[0],
    status: 'open',
  });

  return room;
}

export async function joinRoom(
  userId: string,
  inviteCode: string,
  initialAllocation: number = 0
) {
  const supabase = await createClient();
  await ensureUserExists(userId);

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, min_balance_required')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (!room) {
    throw new Error('Invalid invite code');
  }

  const minRequired = Number(room.min_balance_required || 0);
  const allocated = Math.max(0, initialAllocation);

  if (minRequired > 0 && allocated < minRequired) {
    throw new Error(
      `Cannot join room: Room requires a minimum balance allocation of Rs. ${minRequired.toFixed(
        2
      )}. You attempted to allocate Rs. ${allocated.toFixed(2)}.`
    );
  }

  const { data: existingMember } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', room.id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    throw new Error('Already a member of this room');
  }

  const { error: joinError } = await supabase.from('room_members').insert({
    room_id: room.id,
    user_id: userId,
    role: 'member',
    allocated_balance: allocated,
  });

  if (joinError) {
    throw new Error(`Could not join room: ${joinError.message}`);
  }

  return room;
}

export async function allocateRoomBalance(roomId: string, userId: string, newAllocation: number) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: room } = await supabase
    .from('rooms')
    .select('min_balance_required')
    .eq('id', roomId)
    .single();

  const minRequired = Number(room?.min_balance_required || 0);
  const targetAllocated = Math.max(0, newAllocation);

  if (minRequired > 0 && targetAllocated < minRequired) {
    throw new Error(
      `Allocation failed: Minimum room balance required is Rs. ${minRequired.toFixed(2)}.`
    );
  }

  const { data, error } = await supabase
    .from('room_members')
    .update({ allocated_balance: targetAllocated })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update room balance allocation: ${error.message}`);
  }

  return data;
}


export async function listUserRooms(userId: string) {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from('room_members')
    .select('role, rooms(id, name, invite_code, created_by, created_at)')
    .eq('user_id', userId);

  return members?.map((m) => ({
    role: m.role,
    ...((m.rooms as unknown) as Record<string, unknown>),
  })) || [];
}

export async function getRoomDetail(roomId: string, userId: string) {
  await assertRoomMember(roomId, userId);

  const supabase = await createClient();
  const { data: room } = await supabase
    .from('rooms')
    .select('*, room_members(user_id, role, users(id, name, email))')
    .eq('id', roomId)
    .single();

  return room;
}

export async function getRoomMembers(roomId: string, userId: string) {
  await assertRoomMember(roomId, userId);

  const supabase = await createClient();
  const { data: members } = await supabase
    .from('room_members')
    .select('id, user_id, role, joined_at, users(id, name, email, avatar_url)')
    .eq('room_id', roomId);

  return members || [];
}

export async function updateRoomSettings(
  roomId: string,
  userId: string,
  updates: {
    name?: string;
    currency?: string;
    settlement_frequency?: string;
    recurring_settlement_day?: number;
    target_budget?: number;
  }
) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  // Verify owner
  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (member?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can edit room settings');
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.currency && { currency: updates.currency.trim() }),
      ...(updates.settlement_frequency && { settlement_frequency: updates.settlement_frequency }),
      ...(updates.recurring_settlement_day !== undefined && {
        recurring_settlement_day: Math.max(1, Math.min(28, updates.recurring_settlement_day)),
      }),
      ...(updates.target_budget !== undefined && { target_budget: Math.max(0, updates.target_budget) }),
    })
    .eq('id', roomId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update room settings: ${error.message}`);
  }

  return room;
}

export async function regenerateInviteCode(roomId: string, userId: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (member?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can regenerate invite code');
  }

  const newCode = generateInviteCode();
  const { data: room, error } = await supabase
    .from('rooms')
    .update({ invite_code: newCode })
    .eq('id', roomId)
    .select()
    .single();

  if (error) {
    // Try updating join_code if invite_code column doesn't match
    const { data: roomAlt, error: errAlt } = await supabase
      .from('rooms')
      .update({ join_code: newCode })
      .eq('id', roomId)
      .select()
      .single();

    if (errAlt) throw new Error(`Failed to regenerate invite code: ${error.message}`);
    return roomAlt;
  }

  return room;
}

export async function updateMemberRole(
  roomId: string,
  userId: string,
  targetUserId: string,
  newRole: 'owner' | 'member'
) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (caller?.role !== 'owner') {
    throw new Error('Forbidden: Only room owners can manage member roles');
  }

  if (newRole === 'owner') {
    // Transfer ownership: downgrade current owner, upgrade target
    await supabase
      .from('room_members')
      .update({ role: 'member' })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    await supabase
      .from('rooms')
      .update({ created_by: targetUserId, owner_id: targetUserId })
      .eq('id', roomId);
  }

  const { data, error } = await supabase
    .from('room_members')
    .update({ role: newRole })
    .eq('room_id', roomId)
    .eq('user_id', targetUserId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update member role: ${error.message}`);
  }

  return data;
}

export async function removeMember(roomId: string, userId: string, targetUserId: string) {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const { data: caller } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (caller?.role !== 'owner' && userId !== targetUserId) {
    throw new Error('Forbidden: You can only remove yourself or be removed by room owner');
  }

  const { data: targetMember } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', targetUserId)
    .single();

  if (targetMember?.role === 'owner') {
    throw new Error('Cannot remove room owner. Transfer ownership first.');
  }

  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', targetUserId);

  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }

  return { success: true };
}

