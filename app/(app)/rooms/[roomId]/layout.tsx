import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth';
import { assertRoomMember } from '@/lib/services/rooms';
import { CurrentRoomProvider } from '@/components/rooms/CurrentRoomProvider';
import { RoomSwitcher } from '@/components/rooms/RoomSwitcher';
import Link from 'next/link';

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
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-sm font-semibold text-accent hover:underline">
                ← Dashboard
              </Link>
              <RoomSwitcher />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </div>
    </CurrentRoomProvider>
  );
}
