'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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

export default function BillsPage() {
  const { roomId } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<'rent' | 'electricity' | 'waste' | 'wifi'>('rent');
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [prevUnit, setPrevUnit] = useState('');
  const [currentUnit, setCurrentUnit] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [paidBy, setPaidBy] = useState('');

  const { data: bills, isLoading } = useQuery({
    queryKey: ['bills', roomId],
    queryFn: () => apiClient.get<any[]>(api.bill.list(roomId)),
  });

  const { data: members } = useQuery({
    queryKey: ['room-members', roomId],
    queryFn: () => apiClient.get<any[]>(api.room.members(roomId)),
  });

  const createBillMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.bill.create(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
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
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90">Add Bill</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Room Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bill Type</label>
                <Select value={type} onValueChange={(val: any) => val && setType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="waste">Waste</SelectItem>
                    <SelectItem value="wifi">WiFi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Paid By</label>
                <Select value={paidBy} onValueChange={(val) => val && setPaidBy(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.users.id} value={m.users.id}>
                        {m.users.name} ({m.users.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Month Date</label>
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
                    <label className="text-xs font-medium">Rate per Unit (NPR)</label>
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
                    <div className="text-xs font-semibold text-primary">
                      Computed Total Amount: NPR {calculatedElectricity}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Amount (NPR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button type="submit" className="w-full bg-primary" disabled={createBillMutation.isPending || !paidBy}>
                {createBillMutation.isPending ? 'Saving...' : 'Save Bill'}
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
      ) : bills?.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">No bills logged yet for this period</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bills?.map((b) => (
            <BillCard
              key={b.id}
              type={b.type}
              amount={b.amount}
              month={b.month}
              paidByName={b.paid_by_user?.name || 'Member'}
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
