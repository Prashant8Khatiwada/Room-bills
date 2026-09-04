'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { useContext } from 'react';
import { CurrentRoomContext } from './CurrentRoomProvider';
import { ChevronsUpDown, DoorOpen } from 'lucide-react';

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
  const currentRoom = useContext(CurrentRoomContext);
  const roomId = currentRoom?.roomId ?? '';

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<any[]>(api.room.list),
  });

  function handleSelect(newRoomId: string | null) {
    if (!newRoomId || newRoomId === roomId) return;
    const currentTab = pathname.split('/rooms/')[1]?.split('/')[1] || 'bills';
    router.push(`/rooms/${newRoomId}/${currentTab}`);
  }

  const currentRoomName = rooms?.find((r) => r.id === roomId)?.name;

  return (
    <Select value={roomId} onValueChange={handleSelect}>
      <SelectTrigger className="w-full h-9 bg-muted/50 border-border/60 hover:bg-muted transition-colors">
        <div className="flex items-center gap-2 truncate">
          <DoorOpen className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium text-foreground">
            {currentRoomName ?? 'Select room'}
          </span>
        </div>
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
