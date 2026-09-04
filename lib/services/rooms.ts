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

export async function createRoom(userId: string, name: string) {
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
    })
    .select()
    .single();

  if (roomError || !room) {
    throw new Error(`Failed to create room: ${roomError?.message}`);
  }

  // Insert owner membership
  await supabase.from('room_members').insert({
    room_id: room.id,
    user_id: userId,
    role: 'owner',
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

export async function joinRoom(userId: string, inviteCode: string) {
  const supabase = await createClient();
  await ensureUserExists(userId);

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (!room) {
    throw new Error('Invalid invite code');
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
  });

  if (joinError) {
    throw new Error(`Could not join room: ${joinError.message}`);
  }

  return room;
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
    .select('role, joined_at, users(id, name, email)')
    .eq('room_id', roomId);

  return members || [];
}
