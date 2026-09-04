'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Plus, ShieldCheck, Clock, Trash2, Package, Pencil, FileText } from 'lucide-react';
import { useState } from 'react';

export default function ProductsPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Add Product State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('pcs');

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editUnit, setEditUnit] = useState('');

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

  const updateMutation = useMutation({
    mutationFn: (data: { productId: string; name: string; defaultPrice: number; unitLabel: string }) =>
      apiClient.put(api.product.list(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
      setEditingProduct(null);
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

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName || !editPrice) return;
    updateMutation.mutate({
      productId: editingProduct.id,
      name: editName,
      defaultPrice: Number(editPrice),
      unitLabel: editUnit || 'pcs',
    });
  };

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditPrice(String(p.default_price));
    setEditUnit(p.unit_label || 'pcs');
  };

  const approvedProducts = (products || []).filter((p) => (p.status || 'approved') === 'approved');
  const draftProducts = (products || []).filter((p) => p.status === 'draft');

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
            Save standard items to auto-fill prices when recording room expenses. Items start as drafts until approved by the room owner.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="h-9 gap-1.5 text-xs font-semibold shadow-sm shrink-0">
              <Plus className="size-4" />
              <span>Propose Product</span>
            </Button>
          } />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Propose Product to Catalog</DialogTitle>
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
              <p className="text-[11px] text-amber-500 font-medium bg-amber-500/10 p-2.5 rounded-lg flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" />
                Products start as drafts. The room owner can approve them into the verified catalog.
              </p>
              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Submitting Draft...' : 'Submit Draft Product'}
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
            <CardTitle className="text-base font-bold text-foreground">No products in catalog</CardTitle>
            <CardDescription className="text-xs">
              Propose a product item above to add it to your room's catalog.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* Draft Proposals Section */}
          {draftProducts.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                  <FileText className="size-4" />
                  Draft Proposals ({draftProducts.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Drafts can be edited by members & approved by room owner
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {draftProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-background/90 p-3.5 space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-foreground">{p.name}</h4>
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
                          Draft
                        </span>
                      </div>
                      <p className="text-xs font-mono font-semibold text-primary">
                        NPR {p.default_price} <span className="text-[10px] text-muted-foreground font-sans">/ {p.unit_label || 'pcs'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                      {/* Member Actions: Edit & Delete */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(p)}
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                          title="Edit draft"
                        >
                          <Pencil className="size-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(p.id)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                          title="Delete draft"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      {/* Owner Action: Approve */}
                      {isOwner && (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(p.id)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 font-semibold"
                        >
                          <Check className="size-3 mr-1" /> Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified Approved Catalog Products */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              Verified Catalog Items ({approvedProducts.length})
            </h3>

            {approvedProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No approved products yet. Approve a draft item above to add it to the verified catalog.
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

                    {isOwner ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(p.id)}
                        className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete product"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Edit Product Modal */}
      <Dialog open={!!editingProduct} onOpenChange={(val) => !val && setEditingProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Draft Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Product Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Default Price (NPR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Unit Label</label>
                <Input
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? 'Updating...' : 'Save Draft Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
