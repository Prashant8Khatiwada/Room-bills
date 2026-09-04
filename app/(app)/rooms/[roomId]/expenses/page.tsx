'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpensesPage() {
  const { roomId } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [itemName, setItemName] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkedMembers, setCheckedMembers] = useState<Record<string, boolean>>({});

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

  // Handle Product Autocomplete & fixed/random toggle defaults
  function handleItemNameChange(text: string) {
    setItemName(text);
    const matched = products?.find((p) => p.name.toLowerCase() === text.trim().toLowerCase());

    if (matched) {
      setIsFixed(true);
      setProductId(matched.id);
      setUnitPrice(String(matched.default_price));
    } else {
      setIsFixed(false);
      setProductId(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['products', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      setOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.expense.list(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
    },
  });

  function resetForm() {
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
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90">Add Expense</Button>} />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Item Name</label>
                <Input
                  placeholder="e.g. Milk, Vegetables, Rice"
                  value={itemName}
                  onChange={(e) => handleItemNameChange(e.target.value)}
                  required
                />
              </div>

              {!productId && itemName && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFixed"
                    checked={isFixed}
                    onCheckedChange={(val) => setIsFixed(!!val)}
                  />
                  <label htmlFor="isFixed" className="text-xs text-muted-foreground">
                    Save as fixed product catalog item (autocompletes next time)
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit Price (NPR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="text-sm font-bold text-primary">
                Total Amount: NPR {totalAmount}
              </div>

              <div>
                <label className="text-sm font-medium">Paid By</label>
                <Select value={paidBy} onValueChange={(val) => val && setPaidBy(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.users.id} value={m.users.id}>
                        {m.users.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Expense Date</label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Split Shares</label>
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
                        <span className="font-semibold text-muted-foreground">
                          {isChecked ? `NPR ${splitShare}` : 'Excluded'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary"
                disabled={createMutation.isPending || !paidBy || splits.length === 0}
              >
                {createMutation.isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : expenses?.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">No expenses logged yet for this period</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {expenses?.map((e) => (
            <Card key={e.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">{e.item_name}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {e.expense_date} · Qty: {e.quantity} @ NPR {e.unit_price}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold text-primary">NPR {e.total_amount}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10"
                    onClick={() => deleteMutation.mutate(e.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <div>Paid By: {e.paid_by_user?.name || 'Member'}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
