'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { BillCard } from '@/components/bills/BillCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Plus, Receipt } from 'lucide-react';

export default function BillsPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<'rent' | 'electricity' | 'waste' | 'wifi'>('rent');
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [prevUnit, setPrevUnit] = useState('');
  const [currentUnit, setCurrentUnit] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', roomId],
    queryFn: () => apiClient.get<any[]>(api.bill.list(roomId)),
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

  function resetForm() {
    setType('rent');
    setAmount('');
    setPrevUnit('');
    setCurrentUnit('');
    setRatePerUnit('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy) return;

    if (type === 'electricity') {
      createBillMutation.mutate({
        type: 'electricity',
        month,
        prev_unit: Number(prevUnit),
        current_unit: Number(currentUnit),
        rate_per_unit: Number(ratePerUnit),
        paid_by: paidBy,
      });
    } else {
      createBillMutation.mutate({
        type,
        month,
        amount: Number(amount),
        paid_by: paidBy,
      });
    }
  }

  const calculatedElectricity =
    type === 'electricity' && currentUnit && prevUnit && ratePerUnit
      ? ((Number(currentUnit) - Number(prevUnit)) * Number(ratePerUnit)).toFixed(2)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Bills</h2>
          <p className="text-sm text-muted-foreground">Manage recurring room monthly bills and electricity costs</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 gap-1.5"><Plus className="size-4" /> Add Bill</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Room Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Bill Type</label>
                <Select value={type} onValueChange={(val: any) => val && setType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent" className="text-xs">Rent</SelectItem>
                    <SelectItem value="electricity" className="text-xs">Electricity</SelectItem>
                    <SelectItem value="waste" className="text-xs">Waste</SelectItem>
                    <SelectItem value="wifi" className="text-xs">WiFi</SelectItem>
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

              {type === 'electricity' ? (
                <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                  <div>
                    <label className="text-xs font-medium">Previous Unit</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 1020"
                      value={prevUnit}
                      onChange={(e) => setPrevUnit(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Current Unit</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 1150"
                      value={currentUnit}
                      onChange={(e) => setCurrentUnit(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Rate Per Unit (NPR)</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g. 12"
                      value={ratePerUnit}
                      onChange={(e) => setRatePerUnit(e.target.value)}
                      required
                    />
                  </div>
                  {calculatedElectricity && (
                    <div className="text-xs font-bold text-primary pt-1">
                      Calculated Electricity Total: NPR {calculatedElectricity}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-foreground">Amount (NPR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 12000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button type="submit" disabled={createBillMutation.isPending} className="w-full">
                {createBillMutation.isPending ? 'Saving Bill...' : 'Create Bill'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            <CardTitle className="text-base font-bold text-foreground">No recurring room bills</CardTitle>
            <CardDescription className="text-xs">
              Add monthly room expenses like rent, wifi, and electricity here.
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
