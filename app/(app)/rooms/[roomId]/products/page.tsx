'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Plus, ShieldCheck, Clock, Trash2, Package } from 'lucide-react';
import { useState } from 'react';

export default function ProductsPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('pcs');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', roomId],
    queryFn: () => apiClient.get<any[]>(api.product.list(roomId)),
  });

  const isOwner = userRole === 'owner';

  const createMutation = useMutation({
    mutationFn: (data: { name: string; defaultPrice: number; unitLabel: string }) =>
      apiClient.post(api.product.list(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
      setOpen(false);
      setName('');
      setPrice('');
      setUnit('pcs');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (productId: string) =>
      apiClient.patch(api.product.list(roomId), { productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.product.list(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
    },
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    createMutation.mutate({
      name,
      defaultPrice: Number(price),
      unitLabel: unit || 'pcs',
    });
  };

  const approvedProducts = (products || []).filter((p) => p.status !== 'pending');
  const pendingProducts = (products || []).filter((p) => p.status === 'pending');

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Product Catalog
            </span>
            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                <ShieldCheck className="size-3" />
                Room Owner Admin
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Product Catalog</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Standard products saved in this room automatically populate prices when logging room expenses.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="h-9 gap-1.5 text-xs font-semibold shadow-sm shrink-0">
              <Plus className="size-4" />
              <span>Add Catalog Product</span>
            </Button>
          } />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Product to Catalog</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Product Name</label>
                <Input
                  placeholder="e.g. Milk, Rice (5kg), Gas Cylinder"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Default Price (NPR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 120"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Unit Label</label>
                  <Input
                    placeholder="e.g. pcs, kg, ltr, packet"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>
              {!isOwner && (
                <p className="text-[11px] text-amber-500 font-medium bg-amber-500/10 p-2.5 rounded-lg">
                  Note: Products added by members require approval from the Room Owner before appearing as officially verified.
                </p>
              )}
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Saving...' : isOwner ? 'Add to Catalog' : 'Submit for Owner Approval'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : products?.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <CardHeader className="flex flex-col items-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Package className="size-6" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">Product catalog is empty</CardTitle>
            <CardDescription className="text-xs">
              Add commonly purchased items here so roommates can select them when logging expenses.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* Approved Products Grid */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              Verified Catalog Items ({approvedProducts.length})
            </h3>

            {approvedProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No approved products yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {approvedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{p.name}</h4>
                      <p className="text-xs font-mono font-semibold text-primary">
                        NPR {p.default_price} <span className="text-[10px] text-muted-foreground font-sans">/ {p.unit_label || 'pcs'}</span>
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(p.id)}
                        className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete product"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Products (Requires Owner Approval) */}
          {pendingProducts.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                <Clock className="size-4" />
                Pending Owner Approval ({pendingProducts.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-background/80 p-3"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-foreground">{p.name}</h4>
                      <p className="text-xs font-mono font-medium text-muted-foreground">
                        NPR {p.default_price} / {p.unit_label || 'pcs'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOwner && (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(p.id)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                        >
                          Approve
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(p.id)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
