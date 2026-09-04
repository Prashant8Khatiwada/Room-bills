'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => apiClient.get<any[]>(`${api.admin.users}${search ? `?search=${search}` : ''}`),
  });

  const toggleBanMutation = useMutation({
    mutationFn: ({ userId, disabled }: { userId: string; disabled: boolean }) =>
      apiClient.patch(`${api.admin.users}?id=${userId}`, { disabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage user accounts across the platform</p>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search name or email..."
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
          {users?.map((u) => (
            <Card key={u.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-foreground">
                  {u.name} {u.is_platform_admin && <span className="text-xs text-primary">(Admin)</span>}
                </div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div>
                {!u.is_platform_admin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-danger border-danger/30 hover:bg-danger/10"
                    onClick={() => toggleBanMutation.mutate({ userId: u.id, disabled: true })}
                  >
                    Disable User
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
