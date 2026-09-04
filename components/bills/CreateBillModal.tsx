'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Plus, Check, ChevronDown, Zap, Receipt, ShoppingBag } from 'lucide-react';

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

export type BillCalcMode = 'fixed' | 'quantity' | 'metered';

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
  // Combobox & Title State
  const [name, setName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Calculation Mode & Dynamic Fields
  const [calcMode, setCalcMode] = useState<BillCalcMode>(categoryTab === 'expense' ? 'quantity' : 'fixed');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  // Electricity / Metered Fields
  const [prevUnit, setPrevUnit] = useState('');
  const [currentUnit, setCurrentUnit] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('12');

  // Selected linked product or template ID
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Common Fields
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('');
  const [splitMembers, setSplitMembers] = useState<Record<string, boolean>>({});
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default calcMode when categoryTab changes
  useEffect(() => {
    setCalcMode(categoryTab === 'expense' ? 'quantity' : 'fixed');
  }, [categoryTab]);

  // Auto-set paidBy to current user
  useEffect(() => {
    if (!isOwner && currentUserId) {
      setPaidBy(currentUserId);
    } else if (isOwner && currentUserId && !paidBy) {
      setPaidBy(currentUserId);
    }
  }, [isOwner, currentUserId, paidBy]);

  // Close combobox when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
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

  // Combined catalog/templates list for autocomplete dropdown
  const catalogSuggestions = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      source: 'template' | 'product';
      calcMode: BillCalcMode;
      defaultAmount?: number;
      ratePerUnit?: number;
      defaultPrice?: number;
    }> = [];

    (approvedTemplates || []).forEach((t) => {
      const isMetered = t.category === 'metered' || t.type === 'electricity' || !!t.rate_per_unit;
      items.push({
        id: t.id,
        name: t.name,
        source: 'template',
        calcMode: isMetered ? 'metered' : 'fixed',
        defaultAmount: t.default_amount,
        ratePerUnit: t.rate_per_unit || 12,
      });
    });

    (products || []).forEach((p) => {
      items.push({
        id: p.id,
        name: p.name,
        source: 'product',
        calcMode: 'quantity',
        defaultPrice: p.default_price,
      });
    });

    return items;
  }, [approvedTemplates, products]);

  const filteredSuggestions = useMemo(() => {
    if (!name.trim()) return catalogSuggestions;
    const lower = name.toLowerCase().trim();
    return catalogSuggestions.filter((item) => item.name.toLowerCase().includes(lower));
  }, [catalogSuggestions, name]);

  function handleSelectSuggestion(item: (typeof catalogSuggestions)[0]) {
    setName(item.name);
    setCalcMode(item.calcMode);
    setIsDropdownOpen(false);

    if (item.source === 'product') {
      setSelectedProductId(item.id);
      if (item.defaultPrice) {
        setUnitPrice(String(item.defaultPrice));
      }
    } else {
      setSelectedProductId(null);
      if (item.calcMode === 'metered') {
        if (item.ratePerUnit) setRatePerUnit(String(item.ratePerUnit));
      } else if (item.calcMode === 'fixed') {
        if (item.defaultAmount) setAmount(String(item.defaultAmount));
      }
    }
  }

  // Calculated Dynamic Total Amount
  const calculatedTotal = useMemo(() => {
    if (calcMode === 'fixed') {
      return Number(amount) || 0;
    }
    if (calcMode === 'quantity') {
      const q = Number(quantity) || 0;
      const p = Number(unitPrice) || 0;
      return Number((q * p).toFixed(2));
    }
    if (calcMode === 'metered') {
      const prev = Number(prevUnit) || 0;
      const curr = Number(currentUnit) || 0;
      const rate = Number(ratePerUnit) || 12;
      if (curr >= prev && prev > 0) {
        return Number(((curr - prev) * rate).toFixed(2));
      }
    }
    return 0;
  }, [calcMode, amount, quantity, unitPrice, prevUnit, currentUnit, ratePerUnit]);

  function resetForm() {
    setName('');
    setAmount('');
    setQuantity('1');
    setUnitPrice('');
    setPrevUnit('');
    setCurrentUnit('');
    setRatePerUnit('12');
    setSelectedProductId(null);
    setSplitMembers({});
    setCustomSplitAmounts({});
    setIsDropdownOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy || !name.trim() || calculatedTotal <= 0) return;

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
      if (calcMode === 'metered') {
        const p = Number(prevUnit) || 0;
        const c = Number(currentUnit) || 0;
        const r = Number(ratePerUnit) || 12;
        await onSubmitBill({
          category: categoryTab,
          type: 'electricity',
          name: name.trim(),
          month,
          prev_unit: p,
          current_unit: c,
          rate_per_unit: r,
          amount: calculatedTotal,
          paid_by: paidBy,
          split_among: selectedSplitUserIds.length > 0 ? selectedSplitUserIds : undefined,
          custom_splits: Object.keys(customSplitsPayload).length > 0 ? customSplitsPayload : undefined,
        });
      } else if (calcMode === 'quantity') {
        const q = Number(quantity) || 1;
        const u = Number(unitPrice) || 0;
        await onSubmitBill({
          category: categoryTab,
          type: categoryTab === 'expense' ? 'expense' : 'rent',
          name: name.trim(),
          quantity: q,
          unit_price: u,
          amount: calculatedTotal,
          product_id: selectedProductId,
          expense_date: month,
          month,
          paid_by: paidBy,
          split_among: selectedSplitUserIds.length > 0 ? selectedSplitUserIds : undefined,
          custom_splits: Object.keys(customSplitsPayload).length > 0 ? customSplitsPayload : undefined,
        });
      } else {
        await onSubmitBill({
          category: categoryTab,
          type: categoryTab === 'expense' ? 'expense' : 'rent',
          name: name.trim(),
          month,
          amount: calculatedTotal,
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
      <DialogContent className="max-w-md sm:max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {categoryTab === 'rent' ? 'Pay & Record Room Bill' : 'Record Room Expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Searchable Select + Input Field */}
          <div className="relative" ref={dropdownRef}>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Item / Bill Name
            </label>
            <div className="relative flex items-center">
              <Input
                placeholder={
                  categoryTab === 'rent'
                    ? 'Type or select bill (e.g. Rent, Electricity, WiFi)'
                    : 'Type or select expense (e.g. Vegetables, Rice, Milk)'
                }
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                required
                className="h-9 text-xs pr-8"
              />
              <ChevronDown
                className={`absolute right-2.5 size-4 text-muted-foreground pointer-events-none transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>

            {/* Dropdown Suggestions */}
            {isDropdownOpen && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg max-h-56 overflow-y-auto">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 mb-1">
                  Catalog & Saved Templates
                </p>
                {filteredSuggestions.map((item) => (
                  <div
                    key={`${item.source}-${item.id}`}
                    onClick={() => handleSelectSuggestion(item)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs cursor-pointer hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {item.source === 'template' ? (
                        <Receipt className="size-3.5 text-primary shrink-0" />
                      ) : (
                        <ShoppingBag className="size-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className="font-semibold text-foreground">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                        {item.calcMode === 'metered'
                          ? 'Metered'
                          : item.calcMode === 'quantity'
                          ? 'Per Unit'
                          : 'Fixed'}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-primary">
                      {item.calcMode === 'metered'
                        ? `NPR ${item.ratePerUnit}/unit`
                        : item.calcMode === 'quantity'
                        ? `NPR ${item.defaultPrice || 0}`
                        : `NPR ${item.defaultAmount?.toLocaleString() || 0}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category / Calculation Mode Selection */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Category / Pricing Type
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCalcMode('fixed')}
                className={`py-1.5 px-2 rounded-md transition-all text-center ${
                  calcMode === 'fixed'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fixed Amount
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('quantity')}
                className={`py-1.5 px-2 rounded-md transition-all text-center ${
                  calcMode === 'quantity'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Per Unit / Qty
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('metered')}
                className={`py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 ${
                  calcMode === 'metered'
                    ? 'bg-background text-sky-600 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="size-3 shrink-0" />
                Metered
              </button>
            </div>
          </div>

          {/* Dynamic Pricing Input Fields */}
          {calcMode === 'fixed' && (
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Amount (NPR)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
          )}

          {calcMode === 'quantity' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Quantity</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="1"
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
                  placeholder="e.g. 120"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {calcMode === 'metered' && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-600 flex items-center gap-1">
                  <Zap className="size-3.5" /> Meter Readings (Units)
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  (Curr - Prev) &times; Rate
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Prev Unit</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={prevUnit}
                    onChange={(e) => setPrevUnit(e.target.value)}
                    required
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Current Unit</label>
                  <Input
                    type="number"
                    placeholder="1250"
                    value={currentUnit}
                    onChange={(e) => setCurrentUnit(e.target.value)}
                    required
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Rate / Unit</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="12"
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(e.target.value)}
                    required
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Total Box */}
          <div className="flex items-center justify-between rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Calculated Total</span>
            <span className="font-mono text-base font-extrabold text-primary">
              NPR {calculatedTotal.toLocaleString()}
            </span>
          </div>

          {/* Paid By */}
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

          {/* Split Shares with Roommates */}
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

          {/* Date / Month */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Date / Month</label>
            <Input type="date" value={month} onChange={(e) => setMonth(e.target.value)} required className="h-9 text-xs" />
          </div>

          <Button type="submit" disabled={isSubmitting || !name.trim() || calculatedTotal <= 0} className="w-full h-10 text-xs font-bold shadow-xs">
            {isSubmitting ? 'Saving...' : `Pay & Record · NPR ${calculatedTotal.toLocaleString()}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
