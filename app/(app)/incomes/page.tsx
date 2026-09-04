'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { toast } from 'sonner';
import { RoomAppShell } from '@/components/rooms/RoomAppShell';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
  Wallet,
  Coins,
  AlertTriangle,
  Plus,
  HandCoins,
  User,
  Calendar,
  Trash2,
  BadgeAlert,
  PiggyBank,
  LayoutDashboard,
  Settings,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export default function IncomesAndLoansPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && ['overview', 'incomes', 'settings'].includes(tabParam) ? tabParam : 'overview';

  function handleTabChange(val: string) {
    router.replace(`/incomes?tab=${val}`, { scroll: false });
  }

  const { data: summary, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>(api.user.profile),
  });

  // Income / Loan Form State
  const [sourceInput, setSourceInput] = useState('');
  const [financeType, setFinanceType] = useState<'income' | 'loan'>('income');
  const [lenderInput, setLenderInput] = useState('');
  const [incomeAmountInput, setIncomeAmountInput] = useState('');
  const [incomeDateInput, setIncomeDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Warning limit editor state
  const [warningInput, setWarningInput] = useState('');

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.profile, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Warning spending limit updated successfully!');
    },
  });

  const addIncomeMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.personalIncomes, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(
        financeType === 'loan' ? 'Loan entry recorded successfully!' : 'Income entry recorded successfully!'
      );
      setSourceInput('');
      setLenderInput('');
      setIncomeAmountInput('');
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(api.user.deletePersonalIncome(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Finance entry deleted');
    },
  });

  if (isLoading) {
    return (
      <RoomAppShell>
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
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
    totalPersonalIncome = 0,
    totalLoansBorrowed = 0,
    loanWarningLimit = 0,
    unallocatedBalance = 0,
    isLoanWarningTriggered = false,
    personalIncomes = [],
    lendersSummary = [],
  } = summary || {};

  function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceInput.trim()) return toast.error('Please enter finance source name');
    if (!incomeAmountInput || Number(incomeAmountInput) <= 0)
      return toast.error('Please enter a valid amount');
    if (financeType === 'loan' && !lenderInput.trim())
      return toast.error('Please enter the lender/person name for loan entries');

    addIncomeMutation.mutate({
      source: sourceInput.trim(),
      type: financeType,
      lender_name: financeType === 'loan' ? lenderInput.trim() : undefined,
      amount: Number(incomeAmountInput),
      income_date: incomeDateInput,
    });
  }

  function handleSaveWarningLimit(e: React.FormEvent) {
    e.preventDefault();
    updateProfileMutation.mutate({
      loan_warning_limit: Number(warningInput || loanWarningLimit),
    });
  }

  return (
    <RoomAppShell>
      <div className="space-y-6">

        {/* Top Header */}
        <div className="border-b border-border/60 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="size-7 text-emerald-500" />
            Incomes & Loans Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage salary incomes, freelance earnings, borrowed loans, and loan debt warning thresholds.
          </p>
        </div>

        {/* Soft Loan Debt Warning Alert Banner */}
        {isLoanWarningTriggered && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-sm">Warning: Borrowed Loan Limit Exceeded!</p>
                <p>
                  Your total active borrowed loan debt (Rs. {totalLoansBorrowed.toFixed(2)}) has passed your configured loan warning limit threshold of Rs. {loanWarningLimit.toFixed(2)}.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('settings')}
              className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs shrink-0"
            >
              Adjust Loan Limit
            </Button>
          </div>
        )}

        {/* Top Navigation Tabs: Overview | Income or Loan | Settings */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs font-semibold">
              <LayoutDashboard className="size-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="incomes" className="flex items-center gap-1.5 text-xs font-semibold">
              <HandCoins className="size-3.5" />
              Income or Loan
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs font-semibold">
              <Settings className="size-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Incomes & Loans</span>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Coins className="size-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  Rs. {totalIncome.toLocaleString()}
                </p>
                <div className="text-xs text-muted-foreground mt-1.5 flex justify-between">
                  <span>Salary: Rs. {totalPersonalIncome}</span>
                  {totalLoansBorrowed > 0 && <span className="text-amber-600 font-semibold">Loan: Rs. {totalLoansBorrowed}</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Active Loans</span>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <HandCoins className="size-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  Rs. {totalLoansBorrowed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">{lendersSummary.length} lender records</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Unallocated Liquidity</span>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                    <PiggyBank className="size-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-primary">
                  Rs. {unallocatedBalance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">Available to allocate</p>
              </div>
            </div>

            {/* Active Lenders Breakdown Card */}
            {totalLoansBorrowed > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <HandCoins className="size-5 text-amber-600 dark:text-amber-400" />
                    Active Lenders Debt Tracker
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Summary of borrowed loan amounts by lender name.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 pt-1">
                    {lendersSummary.map((l: any, idx: number) => (
                      <div key={idx} className="px-3.5 py-2 rounded-xl bg-background border border-amber-500/30 text-xs flex items-center gap-2 shadow-sm">
                        <User className="size-3.5 text-amber-500" />
                        <span className="font-semibold text-foreground">{l.lender}:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">Rs. {l.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Action & Recent Incomes List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Add New Quick CTA */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Plus className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base">Record Finance Entry</h3>
                      <p className="text-xs text-muted-foreground">Add new salary income or borrowed loan</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You have <strong className="text-foreground">{personalIncomes.length} total entries</strong> logged in your stream.
                  </p>
                </div>

                <Button onClick={() => handleTabChange('incomes')} className="w-full gap-2 text-xs">
                  <span>Go to Income & Loan Form</span>
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>

              {/* Recent Entries Overview */}
              <Card className="md:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-emerald-500" />
                      Recent Financial Stream
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleTabChange('incomes')} className="text-xs text-primary">
                      View All ({personalIncomes.length})
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {personalIncomes.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No income or loan entries logged yet. Click above to add your first entry!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {personalIncomes.slice(0, 4).map((item: any) => {
                        const isLoan = item.type === 'loan';
                        return (
                          <div key={item.id} className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{item.source}</span>
                                {isLoan ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    Loan: {item.lender_name || 'Person'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Income
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Date: {item.income_date || new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="font-extrabold text-foreground text-sm">
                              Rs. {Number(item.amount).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

          </TabsContent>

          {/* TAB 2: INCOME OR LOAN FORM & STREAM */}
          <TabsContent value="incomes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Form: Add Income or Loan Entry */}
              <Card className="lg:col-span-1 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Plus className="size-4 text-primary" />
                    Add Income or Loan
                  </CardTitle>
                  <CardDescription>
                    Record salary earnings or money borrowed from someone.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleAddIncome}>
                  <CardContent className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Type</label>
                      <Select
                        value={financeType}
                        onValueChange={(val) => val && setFinanceType(val as 'income' | 'loan')}
                      >
                        <SelectTrigger>
                          <SelectValue>
                            {financeType === 'loan'
                              ? 'Borrowed Loan (Money from person)'
                              : 'Personal Income (Salary/Earnings)'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Personal Income (Salary/Earnings)</SelectItem>
                          <SelectItem value="loan">Borrowed Loan (Money from person)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Source / Title</label>
                      <Input
                        placeholder={financeType === 'loan' ? 'e.g. Deposit Loan' : 'e.g. Monthly Salary'}
                        value={sourceInput}
                        onChange={(e) => setSourceInput(e.target.value)}
                      />
                    </div>

                    {financeType === 'loan' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <User className="size-3.5" />
                          Lender / Person Name
                        </label>
                        <Input
                          placeholder="e.g. Ram Prasad"
                          value={lenderInput}
                          onChange={(e) => setLenderInput(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Amount (Rs.)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 25000"
                        step="0.01"
                        min="0"
                        value={incomeAmountInput}
                        onChange={(e) => setIncomeAmountInput(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Date</label>
                      <Input
                        type="date"
                        value={incomeDateInput}
                        onChange={(e) => setIncomeDateInput(e.target.value)}
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Button type="submit" className="w-full gap-2" disabled={addIncomeMutation.isPending}>
                      <Plus className="size-4" />
                      {addIncomeMutation.isPending ? 'Logging...' : financeType === 'loan' ? 'Add Loan Entry' : 'Add Income Entry'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* History Stream List */}
              <Card className="lg:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <HandCoins className="size-4 text-primary" />
                    Incomes & Loans Stream ({personalIncomes.length})
                  </CardTitle>
                  <CardDescription>
                    Full history of recorded income & loan entries.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {personalIncomes.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No income or loan entries logged yet. Use the form on the left to add one!
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                      {personalIncomes.map((item: any) => {
                        const isLoan = item.type === 'loan';
                        return (
                          <div key={item.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-accent/40 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{item.source}</span>
                                {isLoan ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    Loan from {item.lender_name || 'Person'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    Personal Income
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="size-3" />
                                Received: {item.income_date || new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <p className="font-extrabold text-foreground text-sm">
                                Rs. {Number(item.amount).toFixed(2)}
                              </p>
                              <AlertDialog>
                                <AlertDialogTrigger render={
                                  <Button variant="ghost" size="sm" className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                } />
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Finance Entry?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove {item.source} (Rs. {Number(item.amount).toFixed(2)}) from your wallet.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteIncomeMutation.mutate(item.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* TAB 3: SETTINGS & LOAN WARNING LIMIT CONFIG */}
          <TabsContent value="settings" className="space-y-6 max-w-2xl">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BadgeAlert className="size-5 text-amber-500" />
                  Loan Debt Warning Limit Settings
                </CardTitle>
                <CardDescription className="text-xs">
                  Set a soft limit threshold for active borrowed loans. Visual warning alerts trigger when your total active loan debt exceeds this amount.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveWarningLimit}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5 max-w-md">
                    <label className="text-xs font-semibold text-foreground">Loan Debt Warning Limit (Rs.)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={warningInput || loanWarningLimit}
                      onChange={(e) => setWarningInput(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Current threshold: <strong className="text-foreground">Rs. {loanWarningLimit.toLocaleString()}</strong>
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 flex justify-end">
                  <Button size="sm" type="submit" disabled={updateProfileMutation.isPending} className="gap-2">
                    <Settings className="size-3.5" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Loan Warning Settings'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
    </RoomAppShell>
  );
}
