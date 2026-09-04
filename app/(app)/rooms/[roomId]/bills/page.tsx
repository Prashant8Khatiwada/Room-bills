'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Lock, Plus, Receipt, Check, FileText, Clock, Trash2, ChevronDown, X, Layers, Zap } from 'lucide-react';

export default function BillsPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');

  // Multi-Select Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [electricityUnits, setElectricityUnits] = useState<{ prev: string; curr: string; rate: string }>({
    prev: '',
    curr: '',
    rate: '12',
  });

  // Custom Bill State
  const [customName, setCustomName] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');

  // Manage Templates Dialog State
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateAmount, setNewTemplateAmount] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Auto-set paidBy to current user
  useEffect(() => {
    if (!isOwner && currentUserId) {
      setPaidBy(currentUserId);
    } else if (isOwner && currentUserId && !paidBy) {
      setPaidBy(currentUserId);
    }
  }, [isOwner, currentUserId, paidBy]);

  // Close multi-select dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute human name for paidBy
  const currentPaidByName = useMemo(() => {
    if (!paidBy && currentUserId) {
      const match = members?.find((m) => m.users.id === currentUserId);
      return match?.users?.name || userMe?.user?.name || userMe?.user?.email || 'You';
    }
    const match = members?.find((m) => m.users.id === paidBy);
    return match?.users?.name || userMe?.user?.name || userMe?.user?.email || 'You';
  }, [paidBy, currentUserId, members, userMe]);

  const approvedTemplates = useMemo(() => {
    return (templates || []).filter((t) => (t.status || 'approved') === 'approved');
  }, [templates]);

  const draftTemplates = useMemo(() => {
    return (templates || []).filter((t) => t.status === 'draft');
  }, [templates]);

  // Selected bill template objects
  const selectedTemplateItems = useMemo(() => {
    return approvedTemplates.filter((t) => selectedTemplates[t.id]);
  }, [approvedTemplates, selectedTemplates]);

  // Check if electricity is selected in multi-select
  const isElectricitySelected = useMemo(() => {
    return selectedTemplateItems.some((t) => t.type === 'electricity');
  }, [selectedTemplateItems]);

  // Live dynamic total calculation for multi-selected saved bills
  const dynamicTotal = useMemo(() => {
    let sum = 0;
    selectedTemplateItems.forEach((t) => {
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
    });
    return Number(sum.toFixed(2));
  }, [selectedTemplateItems, electricityUnits]);

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
    setCustomName('');
    setCustomAmount('');
    setElectricityUnits({ prev: '', curr: '', rate: '12' });
    setDropdownOpen(false);
  }

  function toggleTemplate(id: string) {
    setSelectedTemplates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  async function handleMultiSelectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy || selectedTemplateItems.length === 0) return;

    for (const t of selectedTemplateItems) {
      if (t.type === 'electricity') {
        const prev = Number(electricityUnits.prev) || 0;
        const curr = Number(electricityUnits.curr) || 0;
        const rate = Number(electricityUnits.rate) || 12;
        await apiClient.post(api.bill.create(roomId), {
          type: 'electricity',
          name: t.name,
          month,
          prev_unit: prev,
          current_unit: curr,
          rate_per_unit: rate,
          paid_by: paidBy,
        });
      } else {
        await apiClient.post(api.bill.create(roomId), {
          type: 'rent',
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
    if (!paidBy || !customName) return;

    createBillMutation.mutate({
      type: 'rent',
      name: customName,
      month,
      amount: Number(customAmount),
      paid_by: paidBy,
    });
  }

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
            <DialogContent className="max-w-md p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Pay & Record Room Bills</DialogTitle>
              </DialogHeader>

              {/* Segmented Control Tabs */}
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className={`py-1.5 rounded-md transition-all ${
                    activeTab === 'saved'
                      ? 'bg-background text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Multi-Select Saved Bills
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`py-1.5 rounded-md transition-all ${
                    activeTab === 'custom'
                      ? 'bg-background text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Manual Custom Entry
                </button>
              </div>

              {/* Mode A: Multi-Select Dropdown Field */}
              {activeTab === 'saved' ? (
                <form onSubmit={handleMultiSelectSubmit} className="space-y-4 pt-1">
                  
                  {/* Multi-Select Field */}
                  <div className="relative" ref={dropdownRef}>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      Select Bills to Pay
                    </label>

                    {/* Trigger Box */}
                    <div
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex min-h-10 w-full flex-wrap items-center justify-between gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs cursor-pointer hover:border-primary transition-all"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                        {selectedTemplateItems.length === 0 ? (
                          <span className="text-muted-foreground">
                            Choose bill templates (Rent, WiFi, Waste...)
                          </span>
                        ) : (
                          selectedTemplateItems.map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTemplate(t.id);
                              }}
                            >
                              {t.name}
                              <X className="size-3 hover:text-destructive transition-colors" />
                            </span>
                          ))
                        )}
                      </div>
                      <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Dropdown Menu Popover */}
                    {dropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg max-h-60 overflow-y-auto">
                        <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                          Available Templates ({approvedTemplates.length})
                        </p>
                        {approvedTemplates.length === 0 ? (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No saved templates found. Create templates or use manual entry.
                          </div>
                        ) : (
                          approvedTemplates.map((t) => {
                            const isChecked = !!selectedTemplates[t.id];
                            return (
                              <div
                                key={t.id}
                                onClick={() => toggleTemplate(t.id)}
                                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-accent text-foreground font-medium'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <Checkbox checked={isChecked} onCheckedChange={() => {}} />
                                  <span>{t.name}</span>
                                </div>
                                <span className="font-mono text-[11px] font-bold">
                                  {t.type === 'electricity' ? 'Meter Rate' : `NPR ${t.default_amount.toLocaleString()}`}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Electricity Meter Input Fields */}
                  {isElectricitySelected && (
                    <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 space-y-2">
                      <p className="text-xs font-bold text-sky-600 flex items-center gap-1">
                        <Zap className="size-3.5" />
                        Electricity Meter Readings
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground">Prev Unit</label>
                          <Input
                            type="number"
                            placeholder="1000"
                            value={electricityUnits.prev}
                            onChange={(e) =>
                              setElectricityUnits((prev) => ({ ...prev, prev: e.target.value }))
                            }
                            required
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
                            required
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
                            required
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Calculated Total Card */}
                  <div className="flex items-center justify-between rounded-lg bg-card border border-border/80 px-3.5 py-3 shadow-xs">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Calculated Total
                    </span>
                    <span className="font-mono text-base font-extrabold text-primary">
                      NPR {dynamicTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Paid By Field */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Paid By</label>
                    {!isOwner ? (
                      <div className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium text-foreground">
                        <span>{currentPaidByName} (You)</span>
                        <Lock className="size-3.5 text-muted-foreground/70" />
                      </div>
                    ) : (
                      <Select
                        value={paidBy}
                        onValueChange={(val) => val && setPaidBy(val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select member">
                            {currentPaidByName}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {members?.map((m) => (
                            <SelectItem key={m.users.id} value={m.users.id} className="text-xs">
                              {m.users.name} {m.users.id === currentUserId ? '(You)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Month Date</label>
                    <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required className="h-9 text-xs" />
                  </div>

                  <Button type="submit" disabled={dynamicTotal <= 0} className="w-full h-10 text-xs font-bold shadow-xs">
                    Record Payment · NPR {dynamicTotal.toLocaleString()}
                  </Button>
                </form>
              ) : (
                /* Mode B: Manual Custom Entry */
                <form onSubmit={handleCustomSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Bill Name</label>
                    <Input
                      placeholder="e.g. House Rent, WiFi Internet, Water Bill"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  {/* Paid By Field */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Paid By</label>
                    {!isOwner ? (
                      <div className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium text-foreground">
                        <span>{currentPaidByName} (You)</span>
                        <Lock className="size-3.5 text-muted-foreground/70" />
                      </div>
                    ) : (
                      <Select
                        value={paidBy}
                        onValueChange={(val) => val && setPaidBy(val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select member">
                            {currentPaidByName}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {members?.map((m) => (
                            <SelectItem key={m.users.id} value={m.users.id} className="text-xs">
                              {m.users.name} {m.users.id === currentUserId ? '(You)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Month Date</label>
                    <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required className="h-9 text-xs" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Amount (NPR)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15000"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <Button type="submit" disabled={createBillMutation.isPending} className="w-full h-10 text-xs font-bold shadow-xs">
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
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Manage Bill Templates</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTemplateName || !newTemplateAmount) return;
              createTemplateMutation.mutate({
                name: newTemplateName,
                type: 'custom',
                defaultAmount: Number(newTemplateAmount),
              });
            }}
            className="space-y-3 rounded-xl border border-border/80 p-4 bg-muted/20"
          >
            <h4 className="text-xs font-bold text-foreground">Propose New Bill Template</h4>
            <div>
              <Input
                placeholder="Bill Name (e.g. Maid / Cleaning)"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Default Amount (NPR)"
                value={newTemplateAmount}
                onChange={(e) => setNewTemplateAmount(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={createTemplateMutation.isPending} className="w-full text-xs font-semibold h-9">
              {createTemplateMutation.isPending ? 'Proposing...' : 'Submit Draft Template'}
            </Button>
          </form>

          {/* Draft Bill Templates List */}
          {draftTemplates.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                <Clock className="size-3.5" /> Draft Proposals ({draftTemplates.length})
              </h4>
              <div className="space-y-2">
                {draftTemplates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{t.name}</span>
                      <p className="font-mono text-[11px] text-muted-foreground">NPR {t.default_amount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOwner && (
                        <Button
                          size="sm"
                          onClick={() => approveTemplateMutation.mutate(t.id)}
                          className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 font-semibold"
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
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-2.5 text-xs">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="font-mono font-semibold text-primary">
                    {t.type === 'electricity' ? 'Meter Rate' : `NPR ${t.default_amount.toLocaleString()}`}
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
              Click &quot;Add Room Bill&quot; to select bill types from the multi-select dropdown and calculate total payment.
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
