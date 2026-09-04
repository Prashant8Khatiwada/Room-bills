'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet,
  Coins,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Building2,
  Receipt,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react';

import { RoomAppShell } from '@/components/rooms/RoomAppShell';

export default function PersonalWalletPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: summary, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>(api.user.profile),
  });

  // Local form state
  const [incomeInput, setIncomeInput] = useState('');
  const [warningInput, setWarningInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [amountInput, setAmountInput] = useState('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.profile, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Global income & warning settings saved!');
      setIsEditingProfile(false);
    },
  });

  const addPersonalExpenseMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.personalExpenses, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Personal expense logged successfully!');
      setTitleInput('');
      setAmountInput('');
    },
  });

  if (isLoading) {
    return (
      <RoomAppShell>
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </RoomAppShell>
    );
  }

  const {
    totalIncome = 0,
    warningLimit = 0,
    totalPersonalSpent = 0,
    totalAllocatedToRooms = 0,
    unallocatedBalance = 0,
    isWarningTriggered = false,
    personalExpenses = [],
    roomAllocations = [],
  } = summary || {};

  function handleSaveProfile() {
    updateProfileMutation.mutate({
      total_income: Number(incomeInput || totalIncome),
      warning_limit: Number(warningInput || warningLimit),
    });
  }

  function handleAddPersonalExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!titleInput.trim()) return toast.error('Please enter an expense title');
    if (!amountInput || Number(amountInput) <= 0)
      return toast.error('Please enter a valid expense amount');

    addPersonalExpenseMutation.mutate({
      title: titleInput.trim(),
      amount: Number(amountInput),
    });
  }

  return (
    <RoomAppShell>
      <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="size-7 text-primary" />
            Personal Global Wallet
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your overall income, set personal spending thresholds, track personal non-room expenses, and allocate balances to shared rooms.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setIncomeInput(String(totalIncome));
            setWarningInput(String(warningLimit));
            setIsEditingProfile(!isEditingProfile);
          }}
        >
          {isEditingProfile ? 'Close Settings' : 'Configure Income & Limits'}
        </Button>
      </div>

      {/* Warning Alert Banner if Spending Exceeds Limit */}
      {isWarningTriggered && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-sm">Warning: Spending Limit Threshold Reached!</p>
            <p>
              Your combined personal spending (Rs. {totalPersonalSpent.toFixed(2)}) and room allocations (Rs. {totalAllocatedToRooms.toFixed(2)}) have crossed your global warning threshold of Rs. {warningLimit.toFixed(2)}.
            </p>
          </div>
        </div>
      )}

      {/* Profile / Income Editor Section */}
      {isEditingProfile && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Global Financial Profile Settings</CardTitle>
            <CardDescription>
              Set your overall income and soft warning limit. (Warning limit displays advisory alerts without blocking your actions).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Total Income / Wallet Balance (Rs.)</label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Warning Spending Threshold (Rs.)</label>
                <Input
                  type="number"
                  placeholder="e.g. 30000"
                  value={warningInput}
                  onChange={(e) => setWarningInput(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t border-border/40 pt-3">
            <Button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Global Profile'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* 1. Total Income */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total Income
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Coins className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">
            Rs. {totalIncome.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Global wallet base</p>
        </div>

        {/* 2. Personal Expenses Spent */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Personal Spent
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <TrendingDown className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">
            Rs. {totalPersonalSpent.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{personalExpenses.length} personal items</p>
        </div>

        {/* 3. Room Allocations */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Allocated to Rooms
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <Building2 className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">
            Rs. {totalAllocatedToRooms.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{roomAllocations.length} active rooms</p>
        </div>

        {/* 4. Unallocated Balance */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Unallocated Pool
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <PiggyBank className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-primary">
            Rs. {unallocatedBalance.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Available for allocation</p>
        </div>
      </div>

      {/* Main Content Grid: Add Personal Expense + Personal Expenses History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Form: Log Personal Non-Room Expense */}
        <Card className="lg:col-span-1 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Log Personal Expense
            </CardTitle>
            <CardDescription>
              Record non-room personal spending (e.g. snacks, clothing, personal travel).
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAddPersonalExpense}>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Title / Description</label>
                <Input
                  placeholder="e.g. Coffee & Pastry"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Amount (Rs.)</label>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  step="0.01"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={addPersonalExpenseMutation.isPending}
              >
                <Plus className="size-4" />
                {addPersonalExpenseMutation.isPending ? 'Logging...' : 'Add Personal Expense'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* List of Personal Expenses */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              Personal Expense Stream ({personalExpenses.length})
            </CardTitle>
            <CardDescription>
              Individual personal expenses deducted from your top-level wallet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {personalExpenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No personal expenses logged yet.
              </div>
            ) : (
              <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                {personalExpenses.map((exp: any) => (
                  <div key={exp.id} className="p-3 flex items-center justify-between text-xs hover:bg-accent/40 transition-colors">
                    <div>
                      <p className="font-bold text-foreground text-sm">{exp.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(exp.created_at).toLocaleDateString()} at {new Date(exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="font-extrabold text-foreground text-sm">
                      Rs. {Number(exp.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  </RoomAppShell>
);
}
