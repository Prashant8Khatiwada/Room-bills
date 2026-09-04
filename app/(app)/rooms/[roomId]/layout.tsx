import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth';
import { assertRoomMember } from '@/lib/services/rooms';
import { CurrentRoomProvider } from '@/components/rooms/CurrentRoomProvider';
import { RoomRealtimeWatcher } from '@/components/rooms/RoomRealtimeWatcher';
import { RoomAppShell } from '@/components/rooms/RoomAppShell';

export default async function RoomShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  try {
    await assertRoomMember(roomId, user.id);
  } catch {
    redirect('/dashboard');
  }

  return (
    <CurrentRoomProvider roomId={roomId}>
      <RoomRealtimeWatcher />
      <RoomAppShell roomId={roomId} userName={user.name}>
        {children}
      </RoomAppShell>
    </CurrentRoomProvider>
  );
}
