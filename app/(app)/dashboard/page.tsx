'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { RoomSwitcher } from '@/components/rooms/RoomSwitcher';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function GlobalDashboardPage() {
  const router = useRouter();

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<any[]>(api.room.list),
  });

  async function handleLogout() {
    await apiClient.post(api.auth.logout);
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Room Expense Tracker</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-foreground">{userMe?.user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Your Rooms</h2>
            <p className="text-sm text-muted-foreground">Select a room to manage bills and expenses</p>
          </div>
          {rooms && rooms.length > 0 && <RoomSwitcher />}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : rooms?.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">No rooms yet</CardTitle>
              <CardDescription>
                Create a new room to start tracking expenses with your room members, or join an existing room using an invite code.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms?.map((r) => (
              <Card key={r.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-foreground">{r.name}</CardTitle>
                  <CardDescription className="text-xs">
                    Invite Code: <span className="font-mono font-bold text-primary">{r.invite_code}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end pt-4">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => router.push(`/rooms/${r.id}/bills`)}
                  >
                    Go to Room
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
