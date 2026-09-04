'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Package, Plus, Sparkles, X, Check, Trash2 } from 'lucide-react';

export default function ExpensesPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Post-expense catalog prompt state
  const [catalogPromptOpen, setCatalogPromptOpen] = useState(false);
  const [lastCustomItem, setLastCustomItem] = useState<{ name: string; unitPrice: number } | null>(null);

  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<string>('custom');
  const [itemName, setItemName] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkedMembers, setCheckedMembers] = useState<Record<string, boolean>>({});

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', roomId],
    queryFn: () => apiClient.get<any[]>(api.expense.list(roomId)),
  });

  const { data: products } = useQuery({
    queryKey: ['products', roomId],
    queryFn: () => apiClient.get<any[]>(api.product.list(roomId)),
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

  // Handle Product Catalog Dropdown selection
  function handleCatalogSelect(prodId: string) {
    setSelectedCatalogProduct(prodId);

    if (prodId === 'custom') {
      setProductId(null);
      setItemName('');
      setUnitPrice('');
      setIsFixed(false);
    } else {
      const p = products?.find((item) => item.id === prodId);
      if (p) {
        setProductId(p.id);
        setItemName(p.name);
        setUnitPrice(String(p.default_price));
        setIsFixed(true);
      }
    }
  }

  const totalAmount = useMemo(() => {
    const q = Number(quantity) || 0;
    const p = Number(unitPrice) || 0;
    return Number((q * p).toFixed(2));
  }, [quantity, unitPrice]);

  // Compute live member splits
  const splits = useMemo(() => {
    if (!members || members.length === 0 || totalAmount <= 0) return [];
    const activeMemberIds = members
      .map((m) => m.users.id)
      .filter((uId) => checkedMembers[uId] !== false);

    if (activeMemberIds.length === 0) return [];

    const totalCents = Math.round(totalAmount * 100);
    const baseCents = Math.floor(totalCents / activeMemberIds.length);
    const remainderCents = totalCents % activeMemberIds.length;

    return activeMemberIds.map((uId) => {
      let shareCents = baseCents;
      if (uId === paidBy) shareCents += remainderCents;
      return { user_id: uId, share: Number((shareCents / 100).toFixed(2)) };
    });
  }, [members, checkedMembers, totalAmount, paidBy]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.expense.create(roomId), data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
      setOpen(false);

      // If created as custom expense (without choosing catalog item), prompt to save to catalog
      if (!variables.product_id && variables.item_name) {
        setLastCustomItem({
          name: variables.item_name,
          unitPrice: variables.unit_price,
        });
        setCatalogPromptOpen(true);
      }

      resetForm();
    },
  });

  const addCatalogMutation = useMutation({
    mutationFn: (data: { name: string; defaultPrice: number }) =>
      apiClient.post(api.product.list(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
      setCatalogPromptOpen(false);
      setLastCustomItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.expense.list(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
    },
  });

  function resetForm() {
    setSelectedCatalogProduct('custom');
    setItemName('');
    setIsFixed(false);
    setProductId(null);
    setQuantity('1');
    setUnitPrice('');
    setCheckedMembers({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy || splits.length === 0) return;

    createMutation.mutate({
      item_name: itemName,
      is_fixed: isFixed,
      product_id: productId,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      total_amount: totalAmount,
      paid_by: paidBy,
      expense_date: expenseDate,
      splits,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Expenses</h2>
          <p className="text-sm text-muted-foreground">Log fixed and variable room expenses with automatic splits</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 gap-1.5"><Plus className="size-4" /> Add Expense</Button>} />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record New Room Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Product Catalog Dropdown */}
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1 mb-1">
                  <Package className="size-3.5 text-primary" />
                  Select from Product Catalog (Optional)
                </label>
                <Select value={selectedCatalogProduct} onValueChange={(val) => val && handleCatalogSelect(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose catalog item or enter custom..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom" className="text-xs font-medium">
                      ✨ Custom Expense (Manual Entry)
                    </SelectItem>
                    {products?.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        📦 {p.name} — NPR {p.default_price} / {p.unit_label || 'pcs'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Product Badge Banner */}
              {selectedCatalogProduct !== 'custom' && (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
                  <span className="font-semibold text-primary">
                    Selected catalog item: {itemName} (NPR {unitPrice})
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCatalogSelect('custom')}
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="size-3 mr-0.5" /> Clear
                  </Button>
                </div>
              )}

              {/* Item Name */}
              <div>
                <label className="text-xs font-semibold text-foreground">Item Name</label>
                <Input
                  placeholder="e.g. Milk, Vegetables, Rice"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  disabled={selectedCatalogProduct !== 'custom'}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Quantity</label>
                  <Input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Unit Price (NPR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    disabled={selectedCatalogProduct !== 'custom'}
                    required
                  />
                </div>
              </div>

              <div className="text-sm font-bold text-primary flex items-center justify-between bg-muted/40 p-2.5 rounded-lg">
                <span>Total Calculated Amount:</span>
                <span className="font-mono text-base font-extrabold">NPR {totalAmount}</span>
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
                    <SelectValue placeholder="Select who paid" />
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
                <label className="text-xs font-semibold text-foreground">Expense Date</label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-2">Split Shares</label>
                <div className="space-y-2 rounded-lg border p-3">
                  {members?.map((m) => {
                    const uId = m.users.id;
                    const isChecked = checkedMembers[uId] !== false;
                    const splitShare = splits.find((s) => s.user_id === uId)?.share || 0;

                    return (
                      <div key={uId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(val) =>
                              setCheckedMembers((prev) => ({ ...prev, [uId]: !!val }))
                            }
                          />
                          <span>{m.users.name}</span>
                        </div>
                        <span className="font-semibold text-muted-foreground font-mono">
                          {isChecked ? `NPR ${splitShare}` : 'Excluded'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Logging Expense...' : 'Save Expense'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Post-Expense Catalog Prompt Dialog */}
      <Dialog open={catalogPromptOpen} onOpenChange={setCatalogPromptOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="flex flex-col items-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
              <Sparkles className="size-6" />
            </div>
            <DialogTitle className="text-base font-bold">Add to Product Catalog?</DialogTitle>
          </DialogHeader>
          {lastCustomItem && (
            <p className="text-xs text-muted-foreground my-2">
              Would you like to save <strong>&quot;{lastCustomItem.name}&quot;</strong> (NPR {lastCustomItem.unitPrice}) to the room Product Catalog for easy future selection?
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setCatalogPromptOpen(false);
                setLastCustomItem(null);
              }}
            >
              No, thanks
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs font-semibold"
              disabled={addCatalogMutation.isPending}
              onClick={() => {
                if (lastCustomItem) {
                  addCatalogMutation.mutate({
                    name: lastCustomItem.name,
                    defaultPrice: lastCustomItem.unitPrice,
                  });
                }
              }}
            >
              {addCatalogMutation.isPending ? 'Saving...' : 'Yes, Add to Catalog'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expenses Table / List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : expenses?.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-muted-foreground">No room expenses logged yet</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {expenses?.map((e) => (
            <ExpenseCard
              key={e.id}
              id={e.id}
              itemName={e.item_name}
              expenseDate={e.expense_date}
              quantity={e.quantity}
              unitPrice={e.unit_price}
              totalAmount={e.total_amount}
              paidByName={e.users?.name || e.users?.email?.split('@')[0] || 'Member'}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
