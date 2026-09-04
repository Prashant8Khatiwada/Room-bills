'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { useCurrentRoom } from './CurrentRoomProvider';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function RoomSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { roomId } = useCurrentRoom();

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<any[]>(api.room.list),
  });

  function handleSelect(newRoomId: string | null) {
    if (!newRoomId || newRoomId === roomId) return;
    // Keep tab route structure if present (e.g., /expenses -> /rooms/newRoomId/expenses)
    const currentTab = pathname.split('/rooms/')[1]?.split('/')[1] || 'bills';
    router.push(`/rooms/${newRoomId}/${currentTab}`);
  }

  return (
    <Select value={roomId} onValueChange={handleSelect}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a room" />
      </SelectTrigger>
      <SelectContent>
        {rooms?.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
