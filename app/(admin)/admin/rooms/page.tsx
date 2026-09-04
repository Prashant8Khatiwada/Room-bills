'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminRoomsPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['admin-rooms', search],
    queryFn: () => apiClient.get<any[]>(`${api.admin.rooms}${search ? `?search=${search}` : ''}`),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => apiClient.delete(`${api.admin.rooms}?id=${roomId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Management</h2>
          <p className="text-sm text-muted-foreground">View and manage all registered rooms</p>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search room name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rooms?.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-foreground">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  Invite Code: <span className="font-mono">{r.invite_code}</span> · Created by:{' '}
                  {r.created_by_user?.name || 'Owner'}
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteRoomMutation.mutate(r.id)}
              >
                Force Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
