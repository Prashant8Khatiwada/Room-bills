'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', roomId],
    queryFn: () => apiClient.get<any[]>(api.product.list(roomId)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.product.list(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
    },
  });

  if (userRole !== 'owner') {
    return (
      <Card className="p-8 text-center border-dashed">
        <CardHeader>
          <CardTitle className="text-base text-danger">Access Restricted</CardTitle>
          <CardDescription>
            Only room owners can access and manage the fixed product catalog.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Fixed Product Catalog</h2>
        <p className="text-sm text-muted-foreground">
          Fixed items saved in this room automatically autocomplete prices when logging expenses.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : products?.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">No fixed products in catalog</CardTitle>
            <CardDescription>
              When adding an expense, toggle &quot;Save as fixed product catalog item&quot; to save items here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products?.map((p) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold text-foreground">{p.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger/10"
                  onClick={() => deleteMutation.mutate(p.id)}
                >
                  Delete
                </Button>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <div>Default Price: NPR {p.default_price}</div>
                {p.unit_label && <div>Unit: {p.unit_label}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
