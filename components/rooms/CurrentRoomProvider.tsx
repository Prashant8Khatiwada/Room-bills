'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

interface CurrentRoomContextType {
  roomId: string;
  room: any;
  isLoading: boolean;
  userRole?: 'owner' | 'member';
}

export const CurrentRoomContext = createContext<CurrentRoomContextType | null>(null);

export function CurrentRoomProvider({
  roomId,
  children,
}: {
  roomId: string;
  children: ReactNode;
}) {
  const { data: room, isLoading } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => apiClient.get(api.room.detail(roomId)),
  });

  return (
    <CurrentRoomContext.Provider
      value={{
        roomId,
        room,
        isLoading,
        userRole: (room as any)?.role,
      }}
    >
      {children}
    </CurrentRoomContext.Provider>
  );
}

export function useCurrentRoom() {
  const context = useContext(CurrentRoomContext);
  if (!context) {
    throw new Error('useCurrentRoom must be used within a CurrentRoomProvider');
  }
  return context;
}
