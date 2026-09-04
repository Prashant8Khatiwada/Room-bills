'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Plus, ShieldCheck, Clock, Trash2, Package, Pencil, FileText, Zap, Receipt, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

export default function CatalogPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'rent' | 'expense'>('all');

  // Form State for Proposing Catalog Item
  const [name, setName] = useState('');
  const [targetCategory, setTargetCategory] = useState<'rent' | 'expense'>('expense');
  const [pricingType, setPricingType] = useState<'fixed' | 'quantity' | 'metered'>('quantity');
  const [amount, setAmount] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('12');

  // Edit State
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editTargetCategory, setEditTargetCategory] = useState<'rent' | 'expense'>('expense');
  const [editPricingType, setEditPricingType] = useState<'fixed' | 'quantity' | 'metered'>('fixed');
  const [editAmount, setEditAmount] = useState('');
  const [editRate, setEditRate] = useState('12');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['bill-templates', roomId],
    queryFn: () => apiClient.get<any[]>(api.bill.templates(roomId)),
  });

  const isOwner = userRole === 'owner';

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.bill.templates(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
      setOpen(false);
      setName('');
      setAmount('');
      setRatePerUnit('12');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.put(api.bill.templates(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
      setEditingTemplate(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (templateId: string) => apiClient.patch(api.bill.templates(roomId), { templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.bill.templates(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
    },
  });

  const handleProposeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      category: pricingType,
      billCategory: targetCategory,
      defaultAmount: pricingType === 'metered' ? 0 : Number(amount || 0),
      ratePerUnit: pricingType === 'metered' ? Number(ratePerUnit || 12) : undefined,
    });
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editName.trim()) return;

    updateMutation.mutate({
      templateId: editingTemplate.id,
      name: editName.trim(),
      category: editPricingType,
      billCategory: editTargetCategory,
      defaultAmount: editPricingType === 'metered' ? 0 : Number(editAmount || 0),
      ratePerUnit: editPricingType === 'metered' ? Number(editRate || 12) : undefined,
    });
  };

  const openEditModal = (t: any) => {
    setEditingTemplate(t);
    setEditName(t.name);
    setEditTargetCategory(t.bill_category || 'rent');
    const pType = t.category || (t.type === 'electricity' || t.rate_per_unit ? 'metered' : 'fixed');
    setEditPricingType(pType);
    setEditAmount(t.default_amount ? String(t.default_amount) : '');
    setEditRate(t.rate_per_unit ? String(t.rate_per_unit) : '12');
  };

  const filteredTemplates = (templates || []).filter((t) => {
    if (activeTabFilter === 'all') return true;
    return (t.bill_category || 'rent') === activeTabFilter;
  });

  const approvedTemplates = filteredTemplates.filter((t) => (t.status || 'approved') === 'approved');
  const draftTemplates = filteredTemplates.filter((t) => t.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Room Catalog
            </span>
            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                <ShieldCheck className="size-3" />
                Room Owner Admin
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Item & Template Catalog</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Unified catalog for reusable daily expense items (groceries, supplies) and recurring bill templates (rent, WiFi, electricity).
          </p>
        </div>

        {/* Propose Catalog Item Modal Trigger */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="h-9 gap-1.5 text-xs font-semibold shadow-sm shrink-0">
              <Plus className="size-4" />
              <span>Propose Catalog Item</span>
            </Button>
          } />
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Propose Catalog Item</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleProposeItem} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Item Name</label>
                <Input
                  placeholder="e.g. Milk, Rice (5kg), Electricity Meter, Maid"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Section Target</label>
                  <Select value={targetCategory} onValueChange={(val: any) => setTargetCategory(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent" className="text-xs font-medium">Room Bills & Rent</SelectItem>
                      <SelectItem value="expense" className="text-xs font-medium">Daily Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Pricing Type</label>
                  <Select value={pricingType} onValueChange={(val: any) => setPricingType(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Pricing Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed" className="text-xs font-medium">Fixed Amount</SelectItem>
                      <SelectItem value="quantity" className="text-xs font-medium">Per Unit / Qty</SelectItem>
                      <SelectItem value="metered" className="text-xs font-medium">Meter Readings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pricingType === 'fixed' || pricingType === 'quantity' ? (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    {pricingType === 'fixed' ? 'Default Amount (NPR)' : 'Default Unit Price (NPR)'}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Rate Per Unit (NPR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 12"
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <p className="text-[11px] text-amber-500 font-medium bg-amber-500/10 p-2.5 rounded-lg flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" />
                Drafts proposed by members require room owner approval before appearing in active dropdowns.
              </p>

              <Button type="submit" disabled={createMutation.isPending} className="w-full h-9 text-xs font-bold">
                {createMutation.isPending ? 'Submitting Draft...' : 'Propose Catalog Item'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Catalog Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTabFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTabFilter === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          All Catalog Items
        </button>
        <button
          type="button"
          onClick={() => setActiveTabFilter('rent')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTabFilter === 'rent'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Receipt className="size-3.5" />
          Room Bills & Rent
        </button>
        <button
          type="button"
          onClick={() => setActiveTabFilter('expense')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTabFilter === 'expense'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <ShoppingBag className="size-3.5" />
          Daily Expenses
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <CardHeader className="flex flex-col items-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Package className="size-6" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">No catalog items created yet</CardTitle>
            <CardDescription className="text-xs">
              Click &quot;Propose Catalog Item&quot; to add reusable bill templates or daily expense items.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Draft Proposals Section */}
          {draftTemplates.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                  <FileText className="size-4" />
                  Draft Proposals ({draftTemplates.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Drafts can be edited by members & approved by room owner
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {draftTemplates.map((t) => {
                  const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
                  const isQty = t.category === 'quantity';
                  return (
                    <div
                      key={t.id}
                      className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-background/90 p-3.5 space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            {t.bill_category === 'expense' ? (
                              <ShoppingBag className="size-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Receipt className="size-3.5 text-primary shrink-0" />
                            )}
                            {t.name}
                          </h4>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
                            {isMetered ? 'Metered' : isQty ? 'Per Unit' : 'Fixed'}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-semibold text-primary">
                          {isMetered
                            ? `NPR ${t.rate_per_unit || 12} / unit`
                            : `NPR ${t.default_amount?.toLocaleString() || 0}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(t)}
                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                            title="Edit draft"
                          >
                            <Pencil className="size-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(t.id)}
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="Delete draft"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>

                        {isOwner && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(t.id)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 font-semibold"
                          >
                            <Check className="size-3 mr-1" /> Approve
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verified Approved Catalog Items */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              Verified Catalog Items ({approvedTemplates.length})
            </h3>

            {approvedTemplates.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No approved catalog items yet. Approve a draft item above to add it to the verified catalog.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {approvedTemplates.map((t) => {
                  const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
                  const isQty = t.category === 'quantity';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {t.bill_category === 'expense' ? (
                            <ShoppingBag className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Receipt className="size-3.5 text-primary shrink-0" />
                          )}
                          <h4 className="font-bold text-sm text-foreground">{t.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {t.bill_category === 'expense' ? 'Expense' : 'Bill'}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-semibold text-primary mt-1">
                          {isMetered
                            ? `NPR ${t.rate_per_unit || 12} / unit`
                            : `NPR ${t.default_amount?.toLocaleString() || 0}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(t)}
                          className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                          title="Edit template"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(t.id)}
                            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete item"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Catalog Item Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={(val) => !val && setEditingTemplate(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Catalog Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateItem} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Item Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Section Target</label>
                <Select value={editTargetCategory} onValueChange={(val: any) => setEditTargetCategory(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent" className="text-xs font-medium">Room Bills & Rent</SelectItem>
                    <SelectItem value="expense" className="text-xs font-medium">Daily Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Pricing Type</label>
                <Select value={editPricingType} onValueChange={(val: any) => setEditPricingType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Pricing Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed" className="text-xs font-medium">Fixed Amount</SelectItem>
                    <SelectItem value="quantity" className="text-xs font-medium">Per Unit / Qty</SelectItem>
                    <SelectItem value="metered" className="text-xs font-medium">Meter Readings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editPricingType === 'fixed' || editPricingType === 'quantity' ? (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  {editPricingType === 'fixed' ? 'Default Amount (NPR)' : 'Default Unit Price (NPR)'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Rate Per Unit (NPR)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

            <Button type="submit" disabled={updateMutation.isPending} className="w-full h-9 text-xs font-bold">
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
