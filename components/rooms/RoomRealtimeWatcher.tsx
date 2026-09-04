'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToRoom } from '@/lib/realtime';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';

export function RoomRealtimeWatcher() {
  const { roomId } = useCurrentRoom();
  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanup = subscribeToRoom(roomId, queryClient);
    return cleanup;
  }, [roomId, queryClient]);

  return null;
}
