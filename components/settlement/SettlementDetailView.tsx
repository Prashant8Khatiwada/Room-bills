'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Scale,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  History,
  Receipt,
  Settings,
  Calculator,
  Search,
  DollarSign,
  Crown,
  AlertCircle,
  HelpCircle,
  FileText,
} from 'lucide-react';

export function SettlementDetailView() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch current open settlement summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['settlement', roomId],
    queryFn: () => apiClient.get<any>(api.settlement.current(roomId)),
  });

  // Fetch settlement history
  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['settlement-history', roomId],
    queryFn: () => apiClient.get<any[]>(api.settlement.history(roomId)),
  });

  // Close period mutation
  const closeMutation = useMutation({
    mutationFn: () => apiClient.post(api.settlement.close(roomId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement-history', roomId] });
      queryClient.invalidateQueries({ queryKey: ['bills', roomId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', roomId] });
      toast.success('Settlement period closed successfully! New open period initiated.');
    },
  });

  if (isSummaryLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    );
  }

  const { room, period, balances, transactions, itemizedBills, totalExpenses, steps } = summary || {};
  const currency = room?.currency || 'Rs.';

  const filteredBills = itemizedBills?.filter((b: any) =>
    b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (b.users?.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    (b.category || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  function handleCopySummaryText() {
    if (!summary) return;
    let report = `📊 *ROOM SETTLEMENT REPORT - ${room?.name || 'Room'}*\n`;
    report += `📅 Period: ${period?.start_date || 'N/A'} to ${period?.end_date || 'N/A'}\n`;
    report += `💵 Total Expenditure: ${currency} ${totalExpenses?.toFixed(2)}\n\n`;

    report += `👥 *MEMBER BALANCES:*\n`;
    balances?.forEach((b: any) => {
      const netSign = b.net > 0 ? '+' : '';
      report += `• ${b.name}: Paid ${currency} ${b.paid.toFixed(2)} | Share ${currency} ${b.owed.toFixed(2)} | Net: ${netSign}${currency} ${b.net.toFixed(2)}\n`;
    });

    report += `\n🤝 *SIMPLIFIED SETTLEMENT PAYMENTS:*\n`;
    if (transactions?.length === 0) {
      report += `✅ All balances settled! No pending debt payments.\n`;
    } else {
      transactions?.forEach((t: any) => {
        const debtorName = balances?.find((b: any) => b.userId === t.from)?.name || 'Member';
        const creditorName = balances?.find((b: any) => b.userId === t.to)?.name || 'Member';
        report += `👉 ${debtorName} pays ${creditorName} ${currency} ${t.amount.toFixed(2)}\n`;
      });
    }

    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success('Settlement summary report copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Overview Header Banner */}
      <Card className="bg-gradient-to-r from-card via-card to-accent/40 border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Scale className="size-6 text-primary" />
                  Settlement Summary
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                  <CheckCircle2 className="size-3" />
                  {period?.status || 'Active'} Period
                </span>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground/70" />
                Cycle: <span className="font-semibold text-foreground">{period?.start_date}</span> to{' '}
                <span className="font-semibold text-foreground">{period?.end_date}</span>
              </p>
            </div>

            {/* Spending Stat & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-background/80 backdrop-blur px-4 py-2 rounded-lg border border-border text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Period Spend</p>
                <p className="text-xl font-extrabold text-primary">
                  {currency} {totalExpenses?.toFixed(2)}
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={handleCopySummaryText} className="gap-1.5">
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy Report'}
              </Button>

              <Link href={`/rooms/${roomId}/settings?tab=settlement`}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Settings className="size-4" />
                  Schedule Settings
                </Button>
              </Link>

              {userRole === 'owner' && period?.status === 'open' && (
                <AlertDialog>
                  <AlertDialogTrigger render={
                    <Button variant="destructive" size="sm" className="gap-1.5">
                      <CheckCircle2 className="size-4" />
                      Close & Settle Period
                    </Button>
                  } />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finalize & Close Settlement Period?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will record an immutable snapshot of all balances ({currency} {totalExpenses?.toFixed(2)} total spend) and automatically initiate the next recurring settlement cycle.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => closeMutation.mutate()}
                      >
                        Confirm & Close Period
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="current" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="current" className="flex items-center gap-1.5">
            <Scale className="size-4" />
            Current Period
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="size-4" />
            Closed History ({history?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Current Settlement */}
        <TabsContent value="current" className="space-y-6">
          {/* Member Balances Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Member Balances Breakdown
              </h3>
              <Dialog>
                <DialogTrigger render={
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Calculator className="size-3.5" />
                    How calculations work
                  </Button>
                } />
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Calculator className="size-5 text-primary" />
                      Mathematical Calculation Steps
                    </DialogTitle>
                    <DialogDescription>
                      Step-by-step breakdown of how member balances and debt simplification transactions are computed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 pt-2 text-xs">
                    {steps?.map((step: string, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-md bg-accent/60 border border-border text-foreground font-mono">
                        {step}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {balances?.map((b: any) => {
                const isCreditor = b.net > 0.005;
                const isDebtor = b.net < -0.005;
                const isSettled = !isCreditor && !isDebtor;

                return (
                  <Card key={b.userId} className="relative overflow-hidden border-border transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {b.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-bold truncate flex items-center gap-1">
                              {b.name}
                              {b.role === 'owner' && <Crown className="size-3 text-amber-500" />}
                            </CardTitle>
                            <CardDescription className="text-[11px] truncate">{b.email}</CardDescription>
                          </div>
                        </div>

                        {/* Net status badge */}
                        <div>
                          {isCreditor && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              + {currency} {b.net.toFixed(2)}
                            </span>
                          )}
                          {isDebtor && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              - {currency} {Math.abs(b.net).toFixed(2)}
                            </span>
                          )}
                          {isSettled && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                              Settled
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-2 text-xs space-y-1.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Paid out of pocket:</span>
                        <span className="font-semibold text-foreground">{currency} {b.paid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Fair share owed:</span>
                        <span className="font-semibold text-foreground">{currency} {b.owed.toFixed(2)}</span>
                      </div>
                      <div className="pt-1.5 border-t border-border flex justify-between font-medium">
                        <span className="text-muted-foreground">Position status:</span>
                        <span className={isCreditor ? 'text-emerald-600 dark:text-emerald-400 font-bold' : isDebtor ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-muted-foreground'}>
                          {isCreditor ? 'Gets Back Money' : isDebtor ? 'Owes Money' : 'Settled Even'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Simplified Debt Settlement Transactions */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Simplified Debt Transfers
            </h3>

            {transactions?.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <CardDescription className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                  <span className="font-semibold text-foreground">All accounts are 100% settled!</span>
                  No cash transfers required among room members for this period.
                </CardDescription>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions?.map((t: any, idx: number) => {
                  const debtorName = balances?.find((b: any) => b.userId === t.from)?.name || 'Member';
                  const creditorName = balances?.find((b: any) => b.userId === t.to)?.name || 'Member';

                  return (
                    <Card key={idx} className="border-border">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center text-xs">
                            {debtorName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {debtorName}
                            </p>
                            <p className="text-xs text-muted-foreground">Debtor (Payer)</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                            {currency} {t.amount.toFixed(2)}
                          </span>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <span>pays to</span>
                            <ArrowRight className="size-3 text-muted-foreground" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {creditorName}
                            </p>
                            <p className="text-xs text-muted-foreground">Creditor (Receiver)</p>
                          </div>
                          <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                            {creditorName.slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Itemized Bills & Expenses in Period */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                Period Itemized Bills & Expenses ({itemizedBills?.length || 0})
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {filteredBills?.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <CardDescription>No bills recorded for this settlement period.</CardDescription>
              </Card>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                {filteredBills?.map((b: any) => (
                  <div key={b.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-accent/40 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{b.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary uppercase">
                          {b.category}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        Paid by <span className="font-semibold text-foreground">{b.users?.name || 'Member'}</span> on {b.expense_date}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-extrabold text-sm text-foreground">
                        {currency} {Number(b.amount).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.bill_splits?.length || 0} member splits
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Settlement History */}
        <TabsContent value="history" className="space-y-4">
          {history?.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <CardDescription>No closed settlement periods found in room archive.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-4">
              {history?.map((h: any) => (
                <Card key={h.id} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Calendar className="size-4 text-primary" />
                          Period: {h.start_date} to {h.end_date}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Closed at: {h.closed_at ? new Date(h.closed_at).toLocaleDateString() : 'Closed'} • {h.billCount} bills
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Settled</p>
                        <p className="text-lg font-extrabold text-primary">
                          {currency} {h.totalExpenses.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs">
                    <div className="border-t border-border pt-3 space-y-2">
                      <p className="font-semibold text-foreground">Member Net Balances:</p>
                      <div className="flex flex-wrap gap-2">
                        {h.balances?.map((b: any) => (
                          <span key={b.userId} className="px-2.5 py-1 rounded bg-muted text-foreground font-mono text-[11px]">
                            {b.name}: {b.net >= 0 ? '+' : ''}{currency} {b.net.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
