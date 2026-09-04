import { createClient as createServerClient } from '@/lib/supabase/server';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_platform_admin: boolean;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('id, name, email, is_platform_admin')
    .eq('id', session.user.id)
    .single();

  if (!userRow) {
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || '',
      is_platform_admin: false,
    };
  }

  return userRow as AuthUser;
}

export async function getCurrentUserRooms() {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createServerClient();
  const { data: members } = await supabase
    .from('room_members')
    .select('role, rooms(id, name, invite_code, created_by, created_at)')
    .eq('user_id', user.id);

  return members?.map((m) => ({
    role: m.role,
    room: m.rooms,
  })) || [];
}
