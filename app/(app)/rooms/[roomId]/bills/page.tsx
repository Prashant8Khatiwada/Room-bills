'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { BillCard } from '@/components/bills/BillCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Plus, Receipt, Check, FileText, Clock, Trash2, ShieldCheck, Sparkles, Calculator } from 'lucide-react';

export default function BillsPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');

  // Multi-Select Saved Bills State
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [electricityUnits, setElectricityUnits] = useState<{ prev: string; curr: string; rate: string }>({
    prev: '',
    curr: '',
    rate: '12',
  });

  // Custom Bill State
  const [customType, setCustomType] = useState<string>('rent');
  const [customName, setCustomName] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');

  // Manage Templates Dialog State
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateAmount, setNewTemplateAmount] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<any>('custom');

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', roomId],
    queryFn: () => apiClient.get<any[]>(api.bill.list(roomId)),
  });

  const { data: templates } = useQuery({
    queryKey: ['bill-templates', roomId],
    queryFn: () => apiClient.get<any[]>(api.bill.templates(roomId)),
  });

  const { data: members } = useQuery({
    queryKey: ['room-members', roomId],
    queryFn: () => apiClient.get<any[]>(api.room.members(roomId)),
  });

  const isOwner = userRole === 'owner';
  const currentUserId = userMe?.user?.id;

  // Auto-set and lock paidBy to current user if not room owner
  useEffect(() => {
    if (!isOwner && currentUserId) {
      setPaidBy(currentUserId);
    } else if (isOwner && currentUserId && !paidBy) {
      setPaidBy(currentUserId);
    }
  }, [isOwner, currentUserId, paidBy]);

  // Live dynamic total calculation for multi-selected saved bills
  const dynamicTotal = useMemo(() => {
    if (!templates) return 0;
    let sum = 0;
    templates.forEach((t) => {
      if (selectedTemplates[t.id]) {
        if (t.type === 'electricity') {
          const prev = Number(electricityUnits.prev) || 0;
          const curr = Number(electricityUnits.curr) || 0;
          const rate = Number(electricityUnits.rate) || 12;
          if (curr >= prev && prev > 0) {
            sum += (curr - prev) * rate;
          }
        } else {
          sum += Number(t.default_amount || 0);
        }
      }
    });
    return Number(sum.toFixed(2));
  }, [templates, selectedTemplates, electricityUnits]);

  const createBillMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.bill.create(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
      setOpen(false);
      resetForm();
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.bill.templates(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
      setTemplateDialogOpen(false);
      setNewTemplateName('');
      setNewTemplateAmount('');
    },
  });

  const approveTemplateMutation = useMutation({
    mutationFn: (templateId: string) => apiClient.patch(api.bill.templates(roomId), { templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.bill.templates(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
    },
  });

  function resetForm() {
    setSelectedTemplates({});
    setCustomType('rent');
    setCustomName('');
    setCustomAmount('');
    setElectricityUnits({ prev: '', curr: '', rate: '12' });
  }

  async function handleMultiSelectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy || !templates) return;

    const chosenTemplates = templates.filter((t) => selectedTemplates[t.id]);
    if (chosenTemplates.length === 0) return;

    for (const t of chosenTemplates) {
      if (t.type === 'electricity') {
        const prev = Number(electricityUnits.prev) || 0;
        const curr = Number(electricityUnits.curr) || 0;
        const rate = Number(electricityUnits.rate) || 12;
        await apiClient.post(api.bill.create(roomId), {
          type: 'electricity',
          month,
          prev_unit: prev,
          current_unit: curr,
          rate_per_unit: rate,
          paid_by: paidBy,
        });
      } else {
        await apiClient.post(api.bill.create(roomId), {
          type: (t.type === 'rent' || t.type === 'wifi' || t.type === 'waste' || t.type === 'electricity') ? t.type : 'rent',
          name: t.name,
          month,
          amount: Number(t.default_amount),
          paid_by: paidBy,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
    queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
    queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
    setOpen(false);
    resetForm();
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy) return;

    createBillMutation.mutate({
      type: customType,
      month,
      amount: Number(customAmount),
      paid_by: paidBy,
    });
  }

  const approvedTemplates = (templates || []).filter((t) => (t.status || 'approved') === 'approved');
  const draftTemplates = (templates || []).filter((t) => t.status === 'draft');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Bills</h2>
          <p className="text-sm text-muted-foreground">Manage recurring monthly room bills with multi-select automatic pricing</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <FileText className="size-3.5 text-primary" />
            <span>Manage Bill Templates</span>
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={
              <Button className="h-9 bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold shadow-sm">
                <Plus className="size-4" /> Add Room Bill
              </Button>
            } />
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Pay & Record Room Bills</DialogTitle>
              </DialogHeader>

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 rounded-xl bg-muted/60 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className={`py-1.5 rounded-lg transition-all ${
                    activeTab === 'saved'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ☑ Multi-Select Saved Bills
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`py-1.5 rounded-lg transition-all ${
                    activeTab === 'custom'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ✍️ Manual Custom Entry
                </button>
              </div>

              {/* Mode A: Multi-Select Saved Bills */}
              {activeTab === 'saved' ? (
                <form onSubmit={handleMultiSelectSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-2">
                      Select Bills to Pay (Dynamic Price Calculation)
                    </label>
                    <div className="space-y-2 rounded-xl border border-border/80 p-3 bg-muted/20">
                      {approvedTemplates.map((t) => {
                        const isChecked = !!selectedTemplates[t.id];
                        const isElec = t.type === 'electricity';
                        return (
                          <div key={t.id} className="space-y-2 rounded-lg border border-border/40 bg-card p-2.5">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-bold text-foreground">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(val) =>
                                    setSelectedTemplates((prev) => ({ ...prev, [t.id]: !!val }))
                                  }
                                />
                                <span>{t.name}</span>
                              </label>
                              <span className="font-mono text-xs font-bold text-primary">
                                {isElec ? 'Per Unit Meter Rate' : `NPR ${t.default_amount}`}
                              </span>
                            </div>

                            {/* Electricity Meter Input Fields if selected */}
                            {isElec && isChecked && (
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
                                <div>
                                  <label className="text-[10px] font-medium text-muted-foreground">Prev Unit</label>
                                  <Input
                                    type="number"
                                    placeholder="1000"
                                    value={electricityUnits.prev}
                                    onChange={(e) =>
                                      setElectricityUnits((prev) => ({ ...prev, prev: e.target.value }))
                                    }
                                    required={isChecked}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-muted-foreground">Curr Unit</label>
                                  <Input
                                    type="number"
                                    placeholder="1120"
                                    value={electricityUnits.curr}
                                    onChange={(e) =>
                                      setElectricityUnits((prev) => ({ ...prev, curr: e.target.value }))
                                    }
                                    required={isChecked}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-medium text-muted-foreground">Rate/Unit</label>
                                  <Input
                                    type="number"
                                    value={electricityUnits.rate}
                                    onChange={(e) =>
                                      setElectricityUnits((prev) => ({ ...prev, rate: e.target.value }))
                                    }
                                    required={isChecked}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Calculated Total Display */}
                  <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-3">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Calculator className="size-4" />
                      Dynamic Calculated Total:
                    </span>
                    <span className="font-mono text-lg font-extrabold text-primary">
                      NPR {dynamicTotal}
                    </span>
                  </div>

                  {/* Paid By Selection (Locked if not owner) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Paid By</label>
                      {!isOwner && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Lock className="size-3 text-amber-500" />
                          Locked to logged-in user
                        </span>
                      )}
                    </div>
                    <Select
                      value={paidBy}
                      onValueChange={(val) => val && setPaidBy(val)}
                      disabled={!isOwner}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members?.map((m) => (
                          <SelectItem key={m.users.id} value={m.users.id} className="text-xs">
                            {m.users.name} {m.users.id === currentUserId ? '(You)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground">Month Date</label>
                    <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required />
                  </div>

                  <Button type="submit" disabled={dynamicTotal <= 0} className="w-full">
                    Pay & Record Selected Bills (NPR {dynamicTotal})
                  </Button>
                </form>
              ) : (
                /* Mode B: Manual Custom Entry */
                <form onSubmit={handleCustomSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Bill Name / Type</label>
                    <Select value={customType} onValueChange={(val: any) => val && setCustomType(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent" className="text-xs">House Rent</SelectItem>
                        <SelectItem value="electricity" className="text-xs">Electricity</SelectItem>
                        <SelectItem value="waste" className="text-xs">Waste Collection</SelectItem>
                        <SelectItem value="wifi" className="text-xs">WiFi Internet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Paid By Selection (Locked if not owner) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Paid By</label>
                      {!isOwner && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Lock className="size-3 text-amber-500" />
                          Locked to logged-in user
                        </span>
                      )}
                    </div>
                    <Select
                      value={paidBy}
                      onValueChange={(val) => val && setPaidBy(val)}
                      disabled={!isOwner}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members?.map((m) => (
                          <SelectItem key={m.users.id} value={m.users.id} className="text-xs">
                            {m.users.name} {m.users.id === currentUserId ? '(You)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground">Month Date</label>
                    <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground">Amount (NPR)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15000"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={createBillMutation.isPending} className="w-full">
                    {createBillMutation.isPending ? 'Saving Bill...' : 'Create Custom Bill'}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Manage Bill Templates Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Saved Bill Templates</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTemplateName || !newTemplateAmount) return;
              createTemplateMutation.mutate({
                name: newTemplateName,
                type: newTemplateType,
                defaultAmount: Number(newTemplateAmount),
              });
            }}
            className="space-y-3 rounded-xl border border-border p-3 bg-muted/30"
          >
            <h4 className="text-xs font-bold text-foreground">Propose New Bill Template</h4>
            <div>
              <Input
                placeholder="Bill Name (e.g. Maid / Cleaning)"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Default Amount (NPR)"
                value={newTemplateAmount}
                onChange={(e) => setNewTemplateAmount(e.target.value)}
                required
                className="h-8 text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={createTemplateMutation.isPending} className="w-full text-xs">
              {createTemplateMutation.isPending ? 'Proposing...' : 'Submit Draft Template'}
            </Button>
          </form>

          {/* Draft Bill Templates List */}
          {draftTemplates.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <Clock className="size-3.5" /> Draft Bill Proposals ({draftTemplates.length})
              </h4>
              <div className="space-y-2">
                {draftTemplates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{t.name}</span>
                      <p className="font-mono text-[11px] text-muted-foreground">NPR {t.default_amount}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOwner && (
                        <Button
                          size="sm"
                          onClick={() => approveTemplateMutation.mutate(t.id)}
                          className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                        >
                          Approve
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTemplateMutation.mutate(t.id)}
                        className="size-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Templates List */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" /> Active Room Templates ({approvedTemplates.length})
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {approvedTemplates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-2 text-xs">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="font-mono font-semibold text-primary">
                    {t.type === 'electricity' ? 'Per Meter Unit' : `NPR ${t.default_amount}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logged Bills List */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : bills?.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <CardHeader className="flex flex-col items-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Receipt className="size-6" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">No recurring room bills logged</CardTitle>
            <CardDescription className="text-xs">
              Click &quot;Add Room Bill&quot; to multi-select saved bills and calculate total payment.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bills?.map((b) => (
            <BillCard
              key={b.id}
              type={b.type}
              amount={b.amount}
              month={b.month}
              paidByName={b.users?.name || b.users?.email?.split('@')[0] || 'Member'}
              prevUnit={b.prev_unit}
              currentUnit={b.current_unit}
              ratePerUnit={b.rate_per_unit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
