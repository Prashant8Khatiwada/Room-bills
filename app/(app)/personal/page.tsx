'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  TrendingDown,
  Building2,
  Receipt,
  PiggyBank,
  HandCoins,
  User,
  Calendar,
  Trash2,
  BadgeAlert,
  ArrowUpRight,
} from 'lucide-react';

export default function PersonalWalletPage() {
  const queryClient = useQueryClient();

  // Queries
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
  const [isEditingWarning, setIsEditingWarning] = useState(false);

  // Personal Expense Form State
  const [expenseTitleInput, setExpenseTitleInput] = useState('');
  const [expenseAmountInput, setExpenseAmountInput] = useState('');

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.profile, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Warning spending threshold updated!');
      setIsEditingWarning(false);
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

  const addExpenseMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.personalExpenses, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Personal expense logged successfully!');
      setExpenseTitleInput('');
      setExpenseAmountInput('');
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
    totalPersonalIncome = 0,
    totalLoansBorrowed = 0,
    warningLimit = 0,
    totalPersonalSpent = 0,
    totalAllocatedToRooms = 0,
    unallocatedBalance = 0,
    isWarningTriggered = false,
    personalIncomes = [],
    personalExpenses = [],
    roomAllocations = [],
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

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseTitleInput.trim()) return toast.error('Please enter an expense title');
    if (!expenseAmountInput || Number(expenseAmountInput) <= 0)
      return toast.error('Please enter a valid expense amount');

    addExpenseMutation.mutate({
      title: expenseTitleInput.trim(),
      amount: Number(expenseAmountInput),
    });
  }

  function handleSaveWarningLimit() {
    updateProfileMutation.mutate({
      warning_limit: Number(warningInput || warningLimit),
    });
  }

  return (
    <RoomAppShell>
      <div className="space-y-6">

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Wallet className="size-7 text-primary" />
              Personal Financial Wallet
            </h1>
            <p className="text-sm text-muted-foreground">
              Track structured incomes & loans, monitor borrowed debts, manage personal expenses, and allocate room funds.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setWarningInput(String(warningLimit));
              setIsEditingWarning(!isEditingWarning);
            }}
            className="gap-1.5 text-xs"
          >
            <BadgeAlert className="size-4 text-amber-500" />
            {isEditingWarning ? 'Close Limit Settings' : 'Warning Limit Settings'}
          </Button>
        </div>

        {/* Soft Warning Limit Banner */}
        {isWarningTriggered && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm">Warning: Spending Limit Threshold Reached!</p>
              <p>
                Your combined personal expenses (Rs. {totalPersonalSpent.toFixed(2)}) and room allocations (Rs. {totalAllocatedToRooms.toFixed(2)}) have crossed your global soft warning limit of Rs. {warningLimit.toFixed(2)}.
              </p>
            </div>
          </div>
        )}

        {/* Warning Threshold Config Card */}
        {isEditingWarning && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BadgeAlert className="size-5 text-amber-500" />
                Soft Warning Spending Limit
              </CardTitle>
              <CardDescription className="text-xs">
                Set a personal budget alert threshold (does not block payments, only shows visual alerts).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 max-w-sm">
                <label className="text-xs font-semibold text-foreground">Warning Limit (Rs.)</label>
                <Input
                  type="number"
                  placeholder="e.g. 30000"
                  value={warningInput}
                  onChange={(e) => setWarningInput(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 justify-end border-t border-border/40">
              <Button size="sm" onClick={handleSaveWarningLimit} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Warning Threshold'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* 4 Financial Metric Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Total Gross Funds */}
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Gross Incomes & Loans
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Coins className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground">
              Rs. {totalIncome.toLocaleString()}
            </p>
            <div className="text-[11px] text-muted-foreground mt-1 flex justify-between">
              <span>Income: Rs. {totalPersonalIncome}</span>
              {totalLoansBorrowed > 0 && <span className="text-amber-600 font-semibold">Loan: Rs. {totalLoansBorrowed}</span>}
            </div>
          </div>

          {/* Personal Spent */}
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Personal Expenses
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <TrendingDown className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground">
              Rs. {totalPersonalSpent.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{personalExpenses.length} items logged</p>
          </div>

          {/* Room Allocations */}
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
            <p className="text-[11px] text-muted-foreground mt-1">{roomAllocations.length} active room allocations</p>
          </div>

          {/* Unallocated Pool */}
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

        {/* Main Content Tabs: Incomes & Loans vs Personal Expenses */}
        <Tabs defaultValue="incomes" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="incomes" className="flex items-center gap-1.5 text-xs">
              <HandCoins className="size-4" />
              Incomes & Loans Tracker
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1.5 text-xs">
              <Receipt className="size-4" />
              Personal Expenses
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Incomes & Loans Manager */}
          <TabsContent value="incomes" className="space-y-6">
            
            {/* Loan Summary Card (If Loans Exist) */}
            {totalLoansBorrowed > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <HandCoins className="size-5 text-amber-600 dark:text-amber-400" />
                    Loan Tracker Summary (Total Debt: Rs. {totalLoansBorrowed.toFixed(2)})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    List of lenders and borrowed loan breakdown.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 pt-2">
                    {lendersSummary.map((l: any, idx: number) => (
                      <div key={idx} className="px-3 py-1.5 rounded-lg bg-background border border-amber-500/30 text-xs flex items-center gap-2">
                        <User className="size-3.5 text-amber-500" />
                        <span className="font-semibold text-foreground">{l.lender}:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">Rs. {l.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Form: Add Income or Loan Entry */}
              <Card className="lg:col-span-1 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Plus className="size-4 text-primary" />
                    Add Income or Loan Entry
                  </CardTitle>
                  <CardDescription>
                    Record salary, freelance earnings, or money borrowed from someone.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleAddIncome}>
                  <CardContent className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Entry Type</label>
                      <Select
                        value={financeType}
                        onValueChange={(val) => setFinanceType(val as 'income' | 'loan')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Personal Income (Salary / Earnings)</SelectItem>
                          <SelectItem value="loan">Borrowed Loan (Money from person)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Finance Source / Title</label>
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
                          placeholder="e.g. Ram Prasad / Uncle Shyam"
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
                      <label className="text-xs font-semibold text-foreground">Date Received / Borrowed</label>
                      <Input
                        type="date"
                        value={incomeDateInput}
                        onChange={(e) => setIncomeDateInput(e.target.value)}
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={addIncomeMutation.isPending}
                    >
                      <Plus className="size-4" />
                      {addIncomeMutation.isPending ? 'Logging...' : financeType === 'loan' ? 'Add Loan Entry' : 'Add Income Entry'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* History Table of Incomes & Loans */}
              <Card className="lg:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <HandCoins className="size-4 text-primary" />
                    Incomes & Loans Stream ({personalIncomes.length})
                  </CardTitle>
                  <CardDescription>
                    Structured log of all your incoming funds and borrowed loans.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {personalIncomes.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No income or loan entries recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                      {personalIncomes.map((item: any) => {
                        const isLoan = item.type === 'loan';
                        return (
                          <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-accent/40 transition-colors">
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

          {/* Tab 2: Personal Expenses */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Form: Add Personal Expense */}
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
                <form onSubmit={handleAddExpense}>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Title / Description</label>
                      <Input
                        placeholder="e.g. Coffee & Pastry"
                        value={expenseTitleInput}
                        onChange={(e) => setExpenseTitleInput(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Amount (Rs.)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 250"
                        step="0.01"
                        min="0"
                        value={expenseAmountInput}
                        onChange={(e) => setExpenseAmountInput(e.target.value)}
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2">
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={addExpenseMutation.isPending}
                    >
                      <Plus className="size-4" />
                      {addExpenseMutation.isPending ? 'Logging...' : 'Add Personal Expense'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Personal Expenses List */}
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
          </TabsContent>
        </Tabs>

      </div>
    </RoomAppShell>
  );
}
