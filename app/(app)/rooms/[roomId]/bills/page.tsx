'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { BillCard } from '@/components/bills/BillCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Plus, Receipt, Check, FileText, Clock, Trash2, ChevronDown, X, Layers, Zap, ShieldCheck, Pencil, AlertTriangle, Loader2 } from 'lucide-react';

function BillsPageContent() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Derived Page View Tab from searchParams: 'logged' | 'templates' | 'logs'
  const rawTab = searchParams.get('tab');
  const pageTab = rawTab === 'templates' ? 'templates' : rawTab === 'logs' ? 'logs' : 'logged';

  function setPageTab(tab: 'logged' | 'templates' | 'logs') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/rooms/${roomId}/bills?${params.toString()}`);
  }

  // Record Bill Modal State
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');

  // Multi-Select Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [templateCustomNames, setTemplateCustomNames] = useState<Record<string, string>>({});
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

  // Bill Template Form State
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'fixed' | 'metered'>('fixed');
  const [newTemplateAmount, setNewTemplateAmount] = useState('');
  const [newTemplateRate, setNewTemplateRate] = useState('12');

  // Edit & Delete Template Dialog State
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [deletingTemplateItem, setDeletingTemplateItem] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'fixed' | 'metered'>('fixed');
  const [editAmount, setEditAmount] = useState('');
  const [editRate, setEditRate] = useState('12');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', roomId],
    queryFn: () => apiClient.get<any[]>(api.bill.list(roomId)),
  });

  const { data: billLogs } = useQuery({
    queryKey: ['bill-logs', roomId],
    queryFn: () => apiClient.get<any[]>(`${api.bill.list(roomId)}?logs=true`),
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

  // Check if any metered bill (e.g. Electricity, Water) is selected in multi-select
  const meteredSelectedItems = useMemo(() => {
    return selectedTemplateItems.filter((t) => t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit);
  }, [selectedTemplateItems]);

  const isMeteredSelected = meteredSelectedItems.length > 0;

  // Live dynamic total calculation for multi-selected saved bills
  const dynamicTotal = useMemo(() => {
    let sum = 0;
    selectedTemplateItems.forEach((t) => {
      const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
      if (isMetered) {
        const prev = Number(electricityUnits.prev) || 0;
        const curr = Number(electricityUnits.curr) || 0;
        const rate = Number(t.rate_per_unit) || 12; // Rate is locked from template!
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
      queryClient.invalidateQueries({ queryKey: ['bill-logs', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
      setOpen(false);
      resetForm();
    },
  });

  const deleteLoggedBillMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.bill.list(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bill-logs', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.bill.templates(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
      setNewTemplateName('');
      setNewTemplateAmount('');
      setNewTemplateRate('12');
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
      setDeletingTemplateItem(null);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: any) => apiClient.put(api.bill.templates(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-templates', roomId] });
      setEditingTemplate(null);
    },
  });

  function openEditModal(t: any) {
    setEditingTemplate(t);
    setEditName(t.name);
    const cat = t.category || (t.type === 'electricity' || t.rate_per_unit ? 'metered' : 'fixed');
    setEditCategory(cat);
    setEditAmount(t.default_amount ? String(t.default_amount) : '');
    setEditRate(t.rate_per_unit ? String(t.rate_per_unit) : '12');
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTemplate || !editName) return;
    updateTemplateMutation.mutate({
      templateId: editingTemplate.id,
      name: editName,
      category: editCategory,
      defaultAmount: editCategory === 'fixed' ? Number(editAmount) : 0,
      ratePerUnit: editCategory === 'metered' ? Number(editRate) : undefined,
    });
  }

  function resetForm() {
    setSelectedTemplates({});
    setTemplateCustomNames({});
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
      const billTitle = (templateCustomNames[t.id] || t.name).trim();
      const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
      if (isMetered) {
        const prev = Number(electricityUnits.prev) || 0;
        const curr = Number(electricityUnits.curr) || 0;
        const rate = Number(t.rate_per_unit) || 12; // Rate locked from template!
        await apiClient.post(api.bill.create(roomId), {
          type: 'electricity',
          name: billTitle,
          month,
          prev_unit: prev,
          current_unit: curr,
          rate_per_unit: rate,
          paid_by: paidBy,
        });
      } else {
        await apiClient.post(api.bill.create(roomId), {
          type: 'rent',
          name: billTitle,
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

  function handleProposeTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateName) return;

    if (newTemplateCategory === 'fixed') {
      if (!newTemplateAmount) return;
      createTemplateMutation.mutate({
        name: newTemplateName,
        category: 'fixed',
        defaultAmount: Number(newTemplateAmount),
      });
    } else {
      if (!newTemplateRate) return;
      createTemplateMutation.mutate({
        name: newTemplateName,
        category: 'metered',
        ratePerUnit: Number(newTemplateRate),
      });
    }
  }

  return (
    <div className="space-y-6">

      {/* Page Header & View Tab Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Room Finance
            </span>
            {isOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                <ShieldCheck className="size-3" />
                Room Owner Admin
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Bills & Templates</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Log monthly recurring room bills or manage saved bill templates.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPageTab('logged')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pageTab === 'logged'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Logged Bills ({bills?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setPageTab('templates')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pageTab === 'templates'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bill Templates ({approvedTemplates.length})
            </button>
            <button
              type="button"
              onClick={() => setPageTab('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                pageTab === 'logs'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Audit Logs ({billLogs?.length || 0})
            </button>
          </div>

          {pageTab === 'logged' && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={
                <Button className="h-9 bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold shadow-sm shrink-0">
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
                              No saved templates found. Create templates in the catalog tab.
                            </div>
                          ) : (
                            approvedTemplates.map((t) => {
                              const isChecked = !!selectedTemplates[t.id];
                              const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
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
                                    {isMetered ? `NPR ${t.rate_per_unit || 12}/unit` : `NPR ${t.default_amount?.toLocaleString() || 0}`}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Editable Bill Titles for Selected Templates */}
                    {selectedTemplateItems.length > 0 && (
                      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                        <label className="text-[11px] font-semibold text-foreground block">
                          Bill Title (Editable)
                        </label>
                        <div className="space-y-2">
                          {selectedTemplateItems.map((t) => (
                            <div key={t.id} className="flex items-center gap-2">
                              <Input
                                value={templateCustomNames[t.id] ?? t.name}
                                onChange={(e) =>
                                  setTemplateCustomNames((prev) => ({ ...prev, [t.id]: e.target.value }))
                                }
                                className="h-8 text-xs bg-background"
                                placeholder="Edit bill name"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metered Readings Inputs for Per-Unit Bills */}
                    {isMeteredSelected && (
                      <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 space-y-3">
                        {meteredSelectedItems.map((t) => {
                          const rate = t.rate_per_unit || 12;
                          return (
                            <div key={t.id} className="space-y-1.5">
                              <p className="text-xs font-bold text-sky-600 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <Zap className="size-3.5" />
                                  {t.name} Meter Readings
                                </span>
                                <span className="text-[10px] font-medium text-sky-500/80">
                                  Template Rate Locked
                                </span>
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
                                  <label className="text-[10px] font-medium text-muted-foreground">Rate/Unit (Locked)</label>
                                  <div className="flex h-8 w-full items-center justify-between rounded-md border border-border bg-muted/60 px-2.5 font-mono text-xs font-semibold text-foreground">
                                    <span>NPR {rate}</span>
                                    <Lock className="size-3 text-muted-foreground/70" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                          <Lock className="size-3.5 text-muted-foreground/70 shrink-0" />
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
                          <Lock className="size-3.5 text-muted-foreground/70 shrink-0" />
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
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {pageTab === 'logged' ? (
        /* TAB 1: LOGGED ROOM BILLS */
        isLoading ? (
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
                Click &quot;Add Room Bill&quot; to select bill types from the multi-select dropdown and record payment.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {bills?.map((b) => (
              <BillCard
                key={b.id}
                id={b.id}
                name={b.name}
                type={b.type}
                amount={b.amount}
                month={b.month}
                paidByName={b.users?.name || b.users?.email?.split('@')[0] || 'Member'}
                prevUnit={b.prev_unit}
                currentUnit={b.current_unit}
                ratePerUnit={b.rate_per_unit}
                canDelete={b.paid_by === currentUserId || isOwner}
                onDelete={() => deleteLoggedBillMutation.mutate(b.id)}
              />
            ))}
          </div>
        )
      ) : pageTab === 'templates' ? (
        /* TAB 2: DEDICATED BILL TEMPLATES CATALOG PAGE */
        <div className="space-y-6">

          {/* Form Card: Propose New Bill Template */}
          <Card className="rounded-2xl border border-border/70 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Propose New Room Bill Template
              </CardTitle>
              <CardDescription className="text-xs">
                Save recurring bills (e.g. Electricity, Water, Rent) to make them selectable in the Multi-Select Payment Dropdown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProposeTemplate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Template Title</label>
                    <Input
                      placeholder="e.g. Electricity Meter, Maid, Rent"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Bill Type Category</label>
                    <Select value={newTemplateCategory} onValueChange={(val: any) => setNewTemplateCategory(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select category">
                          {newTemplateCategory === 'fixed' ? 'Fixed Amount' : 'Metered / Per Unit'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed" className="text-xs">Fixed Amount (Rent, Internet, Maid)</SelectItem>
                        <SelectItem value="metered" className="text-xs">Metered / Per Unit (Electricity, Water)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newTemplateCategory === 'fixed' ? (
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">Default Amount (NPR)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 15000"
                        value={newTemplateAmount}
                        onChange={(e) => setNewTemplateAmount(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">Rate Per Unit (NPR)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 12"
                        value={newTemplateRate}
                        onChange={(e) => setNewTemplateRate(e.target.value)}
                        required
                        className="h-9 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={createTemplateMutation.isPending} className="h-9 text-xs font-bold px-5">
                    {createTemplateMutation.isPending ? 'Submitting Proposal...' : 'Propose Bill Template'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Draft Proposals Section */}
          {draftTemplates.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                  <Clock className="size-4" />
                  Draft Proposals ({draftTemplates.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Draft proposals require owner approval before appearing in the payment dropdown
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {draftTemplates.map((t) => {
                  const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-background/90 p-3.5 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-foreground">{t.name}</h4>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {isMetered ? 'Metered' : 'Fixed'}
                          </span>
                        </div>
                        <p className="font-mono text-xs font-semibold text-primary mt-0.5">
                          {isMetered ? `NPR ${t.rate_per_unit || 12}/unit` : `NPR ${t.default_amount?.toLocaleString() || 0}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isOwner && (
                          <Button
                            size="sm"
                            onClick={() => approveTemplateMutation.mutate(t.id)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 font-semibold"
                          >
                            <Check className="size-3.5 mr-1" /> Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTemplateItem(t)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                          title="Delete proposal"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Verified Templates Grid */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Check className="size-4 text-emerald-500" />
              Active Room Bill Templates ({approvedTemplates.length})
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {approvedTemplates.map((t) => {
                const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-foreground">{t.name}</h4>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isMetered ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isMetered ? 'Metered' : 'Fixed'}
                        </span>
                      </div>
                      <p className="font-mono text-xs font-semibold text-primary mt-1">
                        {isMetered ? `NPR ${t.rate_per_unit || 12} / unit` : `NPR ${t.default_amount?.toLocaleString() || 0}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isOwner && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(t)}
                            className="size-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                            title="Edit template"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingTemplateItem(t)}
                            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete template"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit Template Modal Dialog */}
          <Dialog open={!!editingTemplate} onOpenChange={(val) => !val && setEditingTemplate(null)}>
            <DialogContent className="max-w-md p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Edit Room Bill Template</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Template Title</label>
                  <Input
                    placeholder="e.g. House Rent, Electricity Meter"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Bill Type Category</label>
                  <Select value={editCategory} onValueChange={(val: any) => setEditCategory(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select category">
                        {editCategory === 'fixed' ? 'Fixed Amount' : 'Metered / Per Unit'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed" className="text-xs">Fixed Amount (Rent, Internet, Maid)</SelectItem>
                      <SelectItem value="metered" className="text-xs">Metered / Per Unit (Electricity, Water)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editCategory === 'fixed' ? (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">Default Amount (NPR)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 15000"
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
                      placeholder="e.g. 12"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)} className="h-9 text-xs font-semibold">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateTemplateMutation.isPending} className="h-9 text-xs font-bold px-5">
                    {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Template Confirmation Popup Dialog */}
          <Dialog open={!!deletingTemplateItem} onOpenChange={(val) => !val && setDeletingTemplateItem(null)}>
            <DialogContent className="max-w-sm p-6">
              <DialogHeader>
                <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
                  <AlertTriangle className="size-5" />
                </div>
                <DialogTitle className="text-base font-bold">Delete Bill Template?</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Are you sure you want to delete <strong className="text-foreground">{deletingTemplateItem?.name}</strong>? It will be removed from future multi-select payment options.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingTemplateItem(null)}
                  disabled={deleteTemplateMutation.isPending}
                  className="h-8 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (deletingTemplateItem) {
                      deleteTemplateMutation.mutate(deletingTemplateItem.id);
                    }
                  }}
                  disabled={deleteTemplateMutation.isPending}
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  {deleteTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Deleting...
                    </>
                  ) : (
                    'Delete Template'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      ) : (
        /* TAB 3: AUDIT LOGS SECTION */
        <Card className="rounded-2xl border border-border/70 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              Bill Activity & Audit Logs
            </CardTitle>
            <CardDescription className="text-xs">
              Complete history of created and deleted room bills with timestamps and member actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {(!billLogs || billLogs.length === 0) ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No bill creation or deletion logs recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {billLogs.map((log) => {
                  const isDeleted = log.action === 'deleted';
                  const performerName = log.users?.name || log.users?.email?.split('@')[0] || 'Room Member';
                  const billName = log.details?.name || 'Bill Item';
                  const amount = log.details?.amount || 0;
                  const formattedDate = log.created_at
                    ? new Date(log.created_at).toLocaleString()
                    : 'Recently';

                  return (
                    <div key={log.id} className="flex items-center justify-between p-4 text-xs hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isDeleted
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}
                        >
                          {isDeleted ? 'Deleted' : 'Created'}
                        </span>
                        <div>
                          <p className="font-bold text-foreground text-sm">
                            {billName}
                            {amount > 0 && <span className="font-mono text-primary ml-2 font-extrabold">NPR {amount.toLocaleString()}</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Action by <span className="font-semibold text-foreground">{performerName}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {formattedDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <BillsPageContent />
    </Suspense>
  );
}
