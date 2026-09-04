'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Plus, Check, ChevronDown, X, Zap } from 'lucide-react';

export interface CreateBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryTab: 'rent' | 'expense';
  isOwner: boolean;
  currentUserId?: string;
  members?: any[];
  approvedTemplates: any[];
  products?: any[];
  onSubmitBill: (data: any) => Promise<void> | void;
}

export function CreateBillModal({
  open,
  onOpenChange,
  categoryTab,
  isOwner,
  currentUserId,
  members,
  approvedTemplates,
  products,
  onSubmitBill,
}: CreateBillModalProps) {
  const [activeTab, setActiveTab] = useState<'saved' | 'custom'>('saved');

  // Multi-Select Saved Bills State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [customBatchTitle, setCustomBatchTitle] = useState('');
  const [isCustomTitleOverridden, setIsCustomTitleOverridden] = useState(false);
  const [electricityUnits, setElectricityUnits] = useState<{ prev: string; curr: string; rate: string }>({
    prev: '',
    curr: '',
    rate: '12',
  });

  // Manual Custom Entry State
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'fixed' | 'metered'>('fixed');
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitMembers, setSplitMembers] = useState<Record<string, boolean>>({});
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});

  // Expense catalog state
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<string>('custom');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const currentPaidByName = useMemo(() => {
    if (!paidBy && currentUserId) {
      const match = members?.find((m) => m.users.id === currentUserId);
      return match?.users?.name || 'You';
    }
    const match = members?.find((m) => m.users.id === paidBy);
    return match?.users?.name || 'You';
  }, [paidBy, currentUserId, members]);

  // Selected bill template objects
  const selectedTemplateItems = useMemo(() => {
    return approvedTemplates.filter((t) => selectedTemplates[t.id]);
  }, [approvedTemplates, selectedTemplates]);

  // Auto-generate joined title when selected templates change
  useEffect(() => {
    if (!isCustomTitleOverridden) {
      const autoTitle = selectedTemplateItems.map((t) => t.name).join(' - ');
      setCustomBatchTitle(autoTitle);
    }
  }, [selectedTemplateItems, isCustomTitleOverridden]);

  const meteredSelectedItems = useMemo(() => {
    return selectedTemplateItems.filter((t) => t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit);
  }, [selectedTemplateItems]);

  const isMeteredSelected = meteredSelectedItems.length > 0;

  const dynamicTotal = useMemo(() => {
    let sum = 0;
    selectedTemplateItems.forEach((t) => {
      const isMetered = t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit;
      if (isMetered) {
        const prev = Number(electricityUnits.prev) || 0;
        const curr = Number(electricityUnits.curr) || 0;
        const rate = Number(t.rate_per_unit) || 12;
        if (curr >= prev && prev > 0) {
          sum += (curr - prev) * rate;
        }
      } else {
        sum += Number(t.default_amount || 0);
      }
    });
    return Number(sum.toFixed(2));
  }, [selectedTemplateItems, electricityUnits]);

  function handleCatalogSelect(prodId: string) {
    setSelectedCatalogProduct(prodId);
    if (prodId === 'custom') {
      setProductId(null);
      setCustomName('');
      setUnitPrice('');
      setIsFixed(false);
    } else {
      const p = products?.find((item) => item.id === prodId);
      if (p) {
        setProductId(p.id);
        setCustomName(p.name);
        setUnitPrice(String(p.default_price));
        setIsFixed(true);
      }
    }
  }

  function resetForm() {
    setSelectedTemplates({});
    setCustomBatchTitle('');
    setIsCustomTitleOverridden(false);
    setCustomName('');
    setCustomAmount('');
    setElectricityUnits({ prev: '', curr: '', rate: '12' });
    setSplitMembers({});
    setCustomSplitAmounts({});
    setDropdownOpen(false);
    setSelectedCatalogProduct('custom');
    setQuantity('1');
    setUnitPrice('');
  }

  function toggleTemplate(id: string) {
    setSelectedTemplates((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  async function handleMultiSelectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy || selectedTemplateItems.length === 0 || dynamicTotal <= 0) return;

    const finalTitle = customBatchTitle.trim() || selectedTemplateItems.map((t) => t.name).join(' - ');
    const meteredItem = selectedTemplateItems.find((t) => t.category === 'metered' || t.type === 'electricity' || t.rate_per_unit);
    const prev = Number(electricityUnits.prev) || 0;
    const curr = Number(electricityUnits.curr) || 0;
    const rate = Number(meteredItem?.rate_per_unit) || 12;

    const selectedSplitUserIds = Object.keys(splitMembers).filter((id) => splitMembers[id]);
    const customSplitsPayload: Record<string, number> = {};
    Object.entries(customSplitAmounts).forEach(([mId, val]) => {
      const num = Number(val);
      if (mId !== paidBy && !isNaN(num) && num > 0) {
        customSplitsPayload[mId] = num;
      }
    });

    setIsSubmitting(true);
    try {
      await onSubmitBill({
        category: categoryTab,
        type: meteredItem && selectedTemplateItems.length === 1 ? 'electricity' : 'rent',
        name: finalTitle,
        month,
        amount: dynamicTotal,
        prev_unit: meteredItem && selectedTemplateItems.length === 1 ? prev : undefined,
        current_unit: meteredItem && selectedTemplateItems.length === 1 ? curr : undefined,
        rate_per_unit: meteredItem && selectedTemplateItems.length === 1 ? rate : undefined,
        paid_by: paidBy,
        split_among: selectedSplitUserIds.length > 0 ? selectedSplitUserIds : undefined,
        custom_splits: Object.keys(customSplitsPayload).length > 0 ? customSplitsPayload : undefined,
      });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy || !customName) return;

    const selectedSplitUserIds = Object.keys(splitMembers).filter((id) => splitMembers[id]);
    const customSplitsPayload: Record<string, number> = {};
    Object.entries(customSplitAmounts).forEach(([mId, val]) => {
      const num = Number(val);
      if (mId !== paidBy && !isNaN(num) && num > 0) {
        customSplitsPayload[mId] = num;
      }
    });

    setIsSubmitting(true);
    try {
      if (categoryTab === 'expense') {
        const q = Number(quantity) || 1;
        const p = Number(unitPrice) || Number(customAmount) || 0;
        await onSubmitBill({
          category: 'expense',
          type: 'expense',
          name: customName,
          quantity: q,
          unit_price: p,
          amount: q * p,
          is_fixed: isFixed,
          product_id: productId,
          expense_date: month,
          paid_by: paidBy,
          split_among: selectedSplitUserIds.length > 0 ? selectedSplitUserIds : undefined,
          custom_splits: Object.keys(customSplitsPayload).length > 0 ? customSplitsPayload : undefined,
        });
      } else if (customCategory === 'metered') {
        const prev = Number(electricityUnits.prev) || 0;
        const curr = Number(electricityUnits.curr) || 0;
        const rate = Number(electricityUnits.rate) || 12;
        const amount = (curr - prev) * rate;

        await onSubmitBill({
          category: 'rent',
          type: 'electricity',
          name: customName,
          month,
          prev_unit: prev,
          current_unit: curr,
          rate_per_unit: rate,
          amount,
          paid_by: paidBy,
          split_among: selectedSplitUserIds.length > 0 ? selectedSplitUserIds : undefined,
          custom_splits: Object.keys(customSplitsPayload).length > 0 ? customSplitsPayload : undefined,
        });
      } else {
        await onSubmitBill({
          category: 'rent',
          type: 'rent',
          name: customName,
          month,
          amount: Number(customAmount),
          paid_by: paidBy,
          split_among: selectedSplitUserIds.length > 0 ? selectedSplitUserIds : undefined,
          custom_splits: Object.keys(customSplitsPayload).length > 0 ? customSplitsPayload : undefined,
        });
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={
        <Button className="h-9 bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold shadow-sm shrink-0">
          <Plus className="size-4" /> {categoryTab === 'rent' ? 'Add Room Bill' : 'Add Expense'}
        </Button>
      } />
      <DialogContent className="max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {categoryTab === 'rent' ? 'Pay & Record Room Bills' : 'Record Daily Room Expense'}
          </DialogTitle>
        </DialogHeader>

        {/* Segmented Control Tabs */}
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-medium mb-2">
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`py-1.5 rounded-md transition-all ${
              activeTab === 'saved'
                ? 'bg-background text-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Multi-Select Saved Templates
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
          <form onSubmit={handleMultiSelectSubmit} className="space-y-4">
            <div className="relative" ref={dropdownRef}>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Select Templates to Pay
              </label>

              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex min-h-10 w-full flex-wrap items-center justify-between gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs cursor-pointer hover:border-primary transition-all"
              >
                <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                  {selectedTemplateItems.length === 0 ? (
                    <span className="text-muted-foreground">
                      Choose templates ({categoryTab === 'rent' ? 'Rent, WiFi, Waste...' : 'Groceries, Vegetables...'})
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

              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg max-h-60 overflow-y-auto">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                    Available Templates ({approvedTemplates.length})
                  </p>
                  {approvedTemplates.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No saved templates found in this category.
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

            {selectedTemplateItems.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <label className="text-[11px] font-semibold text-foreground block">
                  Title
                </label>
                <Input
                  value={customBatchTitle}
                  onChange={(e) => {
                    setCustomBatchTitle(e.target.value);
                    setIsCustomTitleOverridden(true);
                  }}
                  className="h-8 text-xs bg-background"
                  placeholder="e.g. House Rent - WiFi / Internet"
                />
              </div>
            )}

            {isMeteredSelected && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 space-y-3">
                {meteredSelectedItems.map((t) => (
                  <div key={t.id} className="space-y-1.5">
                    <p className="text-xs font-bold text-sky-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Zap className="size-3.5" />
                        {t.name} Meter Readings
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
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
                        <label className="text-[10px] font-medium text-muted-foreground">Current Unit</label>
                        <Input
                          type="number"
                          placeholder="1250"
                          value={electricityUnits.curr}
                          onChange={(e) =>
                            setElectricityUnits((prev) => ({ ...prev, curr: e.target.value }))
                          }
                          required
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground">Calculated Total</span>
              <span className="font-mono text-base font-extrabold text-primary">
                NPR {dynamicTotal.toLocaleString()}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Paid By</label>
              {!isOwner ? (
                <div className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium text-foreground">
                  <span>{currentPaidByName} (You)</span>
                  <Lock className="size-3.5 text-muted-foreground/70 shrink-0" />
                </div>
              ) : (
                <Select value={paidBy} onValueChange={(val) => val && setPaidBy(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select member">{currentPaidByName}</SelectValue>
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
              <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center justify-between">
                <span>Split Shares with Roommates</span>
                <span className="text-[10px] text-muted-foreground font-normal">Payer covers balance</span>
              </label>
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                {members
                  ?.filter((m) => m.users.id !== paidBy)
                  .map((m) => {
                    const isSelected = splitMembers[m.users.id] ?? true;
                    return (
                      <div key={m.users.id} className="flex items-center justify-between gap-2 bg-background p-2 rounded-md border border-border/60">
                        <button
                          type="button"
                          onClick={() =>
                            setSplitMembers((prev) => ({
                              ...prev,
                              [m.users.id]: !isSelected,
                            }))
                          }
                          className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                        >
                          <span className={`size-3.5 rounded-xs border flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                          }`}>
                            {isSelected && <Check className="size-2.5 stroke-[3]" />}
                          </span>
                          <span className="font-semibold text-foreground">{m.users.name}</span>
                        </button>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-mono">NPR</span>
                            <Input
                              type="number"
                              placeholder="Auto equal"
                              value={customSplitAmounts[m.users.id] || ''}
                              onChange={(e) =>
                                setCustomSplitAmounts((prev) => ({
                                  ...prev,
                                  [m.users.id]: e.target.value,
                                }))
                              }
                              className="h-7 w-24 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Date / Month</label>
              <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required className="h-9 text-xs" />
            </div>

            <Button type="submit" disabled={isSubmitting || selectedTemplateItems.length === 0} className="w-full h-10 text-xs font-bold shadow-xs">
              {isSubmitting ? 'Saving...' : `Pay & Record · NPR ${dynamicTotal.toLocaleString()}`}
            </Button>
          </form>
        ) : (
          /* Mode B: Manual Custom Entry Form */
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            {categoryTab === 'expense' && products && products.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Select from Product Catalog
                </label>
                <Select value={selectedCatalogProduct} onValueChange={(val) => val && handleCatalogSelect(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose catalog item or custom..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom" className="text-xs font-medium">
                      Custom Entry (Manual)
                    </SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} — NPR {p.default_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Item / Bill Name</label>
              <Input
                placeholder={categoryTab === 'rent' ? 'e.g. House Rent, Internet' : 'e.g. Vegetables, Groceries'}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            {categoryTab === 'expense' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Quantity</label>
                  <Input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Unit Price (NPR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Amount (NPR)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="5000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Paid By</label>
              {!isOwner ? (
                <div className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 text-xs font-medium text-foreground">
                  <span>{currentPaidByName} (You)</span>
                  <Lock className="size-3.5 text-muted-foreground/70 shrink-0" />
                </div>
              ) : (
                <Select value={paidBy} onValueChange={(val) => val && setPaidBy(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select member">{currentPaidByName}</SelectValue>
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
              <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center justify-between">
                <span>Split Shares with Roommates</span>
                <span className="text-[10px] text-muted-foreground font-normal">Payer covers balance</span>
              </label>
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                {members
                  ?.filter((m) => m.users.id !== paidBy)
                  .map((m) => {
                    const isSelected = splitMembers[m.users.id] ?? true;
                    return (
                      <div key={m.users.id} className="flex items-center justify-between gap-2 bg-background p-2 rounded-md border border-border/60">
                        <button
                          type="button"
                          onClick={() =>
                            setSplitMembers((prev) => ({
                              ...prev,
                              [m.users.id]: !isSelected,
                            }))
                          }
                          className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                        >
                          <span className={`size-3.5 rounded-xs border flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                          }`}>
                            {isSelected && <Check className="size-2.5 stroke-[3]" />}
                          </span>
                          <span className="font-semibold text-foreground">{m.users.name}</span>
                        </button>
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-mono">NPR</span>
                            <Input
                              type="number"
                              placeholder="Auto equal"
                              value={customSplitAmounts[m.users.id] || ''}
                              onChange={(e) =>
                                setCustomSplitAmounts((prev) => ({
                                  ...prev,
                                  [m.users.id]: e.target.value,
                                }))
                              }
                              className="h-7 w-24 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Date / Month</label>
              <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required className="h-9 text-xs" />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-10 text-xs font-bold shadow-xs">
              {isSubmitting ? 'Saving...' : 'Save & Record Entry'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
