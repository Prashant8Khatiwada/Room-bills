'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { CreateBillModal } from '@/components/bills/CreateBillModal';
import { BillCard } from '@/components/bills/BillCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Check, FileText, Clock, Trash2, Layers, ShieldCheck, Pencil, AlertTriangle, Loader2 } from 'lucide-react';

function BillsPageContent() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryTab: 'rent' | 'expense' = 'rent';

  // Record Bill Modal State
  const [open, setOpen] = useState(false);

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: bills, isLoading } = useQuery({
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

  const createBillMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(api.bill.create(roomId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bill-logs', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
      setOpen(false);
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

  return (
    <div className="space-y-6">
      {/* Clean Unified Top Bar */}
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
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {categoryTab === 'rent' ? 'Room Rent & Fixed Bills' : 'Room Daily Expenses'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {categoryTab === 'rent'
              ? 'Log house rent, electricity, wifi, and recurring bills with automatic split calculations.'
              : 'Log daily room purchases like groceries, vegetables, and shared supplies with splits.'}
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
            await createBillMutation.mutateAsync(payload);
          }}
        />
      </div>

      {/* Main Content Area: LOGGED ROOM BILLS */}
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
              onDelete={() => deleteLoggedBillMutation.mutate(b.id)}
            />
          ))}
        </div>
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
