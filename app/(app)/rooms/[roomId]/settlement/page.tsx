'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { MemberBalanceCard } from '@/components/settlement/MemberBalanceCard';
import { SettlementTransactionCard } from '@/components/settlement/SettlementTransactionCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function SettlementPage() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['settlement', roomId],
    queryFn: () => apiClient.get<any>(api.settlement.current(roomId)),
  });

  const closeMutation = useMutation({
    mutationFn: () => apiClient.post(api.settlement.close(roomId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { period, balances, transactions } = summary || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Settlement Summary</h2>
          <p className="text-sm text-muted-foreground">
            Period: <span className="font-semibold text-primary">{period?.start_date}</span> to{' '}
            <span className="font-semibold text-primary">{period?.end_date}</span> ({period?.status})
          </p>
        </div>

        {userRole === 'owner' && period?.status === 'open' && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive">Close Period</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close Settlement Period?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will finalize all debt settlements for the current period and automatically start a new open period. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-danger hover:bg-danger/90"
                  onClick={() => closeMutation.mutate()}
                >
                  Close & Start Next Period
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Member Balances</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {balances?.map((b: any) => (
            <MemberBalanceCard
              key={b.userId}
              name={b.name}
              email={b.email}
              paid={b.paid}
              owed={b.owed}
              net={b.net}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-foreground">Simplified Debt Transactions</h3>
        {transactions?.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <CardDescription>All member accounts are settled evenly for this period!</CardDescription>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions?.map((t: any, idx: number) => {
              const debtorName = balances?.find((b: any) => b.userId === t.from)?.name || 'Member';
              const creditorName = balances?.find((b: any) => b.userId === t.to)?.name || 'Member';

              return (
                <SettlementTransactionCard
                  key={idx}
                  debtorName={debtorName}
                  creditorName={creditorName}
                  amount={t.amount}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
