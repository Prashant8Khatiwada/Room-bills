'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, Suspense } from 'react';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { CreateBillModal } from '@/components/bills/CreateBillModal';
import { BillCard } from '@/components/bills/BillCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, ShieldCheck } from 'lucide-react';

function ExpensesPageContent() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const categoryTab: 'rent' | 'expense' = 'expense';

  // Record Expense Modal State
  const [open, setOpen] = useState(false);

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['bills', roomId, categoryTab],
    queryFn: () => apiClient.get<any[]>(`${api.bill.list(roomId)}?category=${categoryTab}`),
  });

  const { data: templates } = useQuery({
    queryKey: ['bill-templates', roomId, categoryTab],
    queryFn: () => apiClient.get<any[]>(`${api.bill.templates(roomId)}?billCategory=${categoryTab}`),
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

  const approvedTemplates = useMemo(() => {
    return (templates || []).filter((t) => (t.status || 'approved') === 'approved');
  }, [templates]);

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.bill.create(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bill-logs', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
      setOpen(false);
    },
  });

  const deleteLoggedExpenseMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${api.bill.list(roomId)}?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bill-logs', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Clean Top Bar for Expenses */}
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Daily Expenses</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Log daily room purchases like groceries, vegetables, and shared supplies with splits.
          </p>
        </div>

        {/* Action Button using clean separate CreateBillModal */}
        <CreateBillModal
          open={open}
          onOpenChange={setOpen}
          categoryTab={categoryTab}
          isOwner={isOwner}
          currentUserId={currentUserId}
          members={members}
          approvedTemplates={approvedTemplates}
          products={products}
          onSubmitBill={async (payload) => {
            await createExpenseMutation.mutateAsync(payload);
          }}
        />
      </div>

      {/* Main Content Area: LOGGED ROOM EXPENSES */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : expenses?.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <CardHeader className="flex flex-col items-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3">
              <Wallet className="size-6" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">No daily expenses logged</CardTitle>
            <CardDescription className="text-xs">
              Click &quot;Add Expense&quot; to select expense catalog items or type custom purchases.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {expenses?.map((b) => (
            <BillCard
              key={b.id}
              id={b.id}
              name={b.name}
              type={b.type}
              amount={b.amount}
              month={b.month}
              paidByName={b.paid_by_user?.name || b.users?.name || b.users?.email?.split('@')[0] || 'Member'}
              prevUnit={b.prev_unit}
              currentUnit={b.current_unit}
              ratePerUnit={b.rate_per_unit}
              billSplits={b.bill_splits?.map((s: any) => {
                const m = members?.find((mem) => mem.users.id === s.user_id);
                return {
                  user_id: s.user_id,
                  share: s.share,
                  user_name: m?.users?.name || (s.user_id === currentUserId ? 'You' : 'Member'),
                };
              })}
              canDelete={b.paid_by === currentUserId || isOwner}
              onDelete={() => deleteLoggedExpenseMutation.mutate(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <ExpensesPageContent />
    </Suspense>
  );
}
