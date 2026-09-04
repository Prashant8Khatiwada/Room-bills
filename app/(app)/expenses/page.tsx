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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt,
  Plus,
  TrendingDown,
  Calendar,
  AlertTriangle,
  LayoutDashboard,
  Settings,
  BadgeAlert,
  ArrowUpRight,
} from 'lucide-react';

export default function PersonalExpensesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && ['overview', 'expenses', 'settings'].includes(tabParam) ? tabParam : 'overview';

  function handleTabChange(val: string) {
    router.replace(`/expenses?tab=${val}`, { scroll: false });
  }

  const { data: summary, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>(api.user.profile),
  });

  const [expenseTitleInput, setExpenseTitleInput] = useState('');
  const [expenseAmountInput, setExpenseAmountInput] = useState('');
  const [warningInput, setWarningInput] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.profile, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Warning limit settings updated!');
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
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </RoomAppShell>
    );
  }

  const {
    totalPersonalSpent = 0,
    personalExpenses = [],
    warningLimit = 0,
    isWarningTriggered = false,
  } = summary || {};

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

  function handleSaveWarningLimit(e: React.FormEvent) {
    e.preventDefault();
    updateProfileMutation.mutate({
      warning_limit: Number(warningInput || warningLimit),
    });
  }

  return (
    <RoomAppShell>
      <div className="space-y-6">

        {/* Top Header */}
        <div className="border-b border-border/60 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="size-7 text-primary" />
            Personal Expenses Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log individual personal expenses outside of shared room bills and configure spending alerts.
          </p>
        </div>

        {/* Warning Alert Banner */}
        {isWarningTriggered && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-sm">Warning: Budget Limit Exceeded</p>
                <p>
                  Your total personal spending is passing your set warning limit threshold of Rs. {warningLimit.toFixed(2)}.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('settings')}
              className="border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs shrink-0"
            >
              Adjust Settings
            </Button>
          </div>
        )}

        {/* Top Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs font-semibold">
              <LayoutDashboard className="size-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1.5 text-xs font-semibold">
              <Receipt className="size-3.5" />
              Personal Expenses
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs font-semibold">
              <Settings className="size-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Personal Expenses</span>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                    <TrendingDown className="size-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  Rs. {totalPersonalSpent.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">{personalExpenses.length} personal entries logged</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Soft Warning Threshold</span>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <AlertTriangle className="size-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  Rs. {warningLimit.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">Configured limit threshold</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Add Expense Quick CTA */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Plus className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base">Log Personal Expense</h3>
                      <p className="text-xs text-muted-foreground">Add new non-room individual bill</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Record snacks, clothing, personal travel, or utility bills.
                  </p>
                </div>

                <Button onClick={() => handleTabChange('expenses')} className="w-full gap-2 text-xs">
                  <span>Go to Personal Expense Form</span>
                  <ArrowUpRight className="size-4" />
                </Button>
              </div>

              {/* Recent Expenses List Overview */}
              <Card className="md:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Receipt className="size-4 text-primary" />
                      Recent Logged Expenses
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleTabChange('expenses')} className="text-xs text-primary">
                      View All ({personalExpenses.length})
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {personalExpenses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No personal expenses logged yet. Click above to add your first expense!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {personalExpenses.slice(0, 4).map((exp: any) => (
                        <div key={exp.id} className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-foreground">{exp.title}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(exp.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-extrabold text-foreground text-sm">
                            Rs. {Number(exp.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* TAB 2: EXPENSES FORM & STREAM */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Form */}
              <Card className="lg:col-span-1 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Plus className="size-4 text-primary" />
                    Log Personal Expense
                  </CardTitle>
                  <CardDescription>
                    Record individual personal spending (snacks, travel, clothing).
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
                    <Button type="submit" className="w-full gap-2" disabled={addExpenseMutation.isPending}>
                      <Plus className="size-4" />
                      {addExpenseMutation.isPending ? 'Logging...' : 'Add Personal Expense'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Expense History List */}
              <Card className="lg:col-span-2 border-border">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    Personal Expense Stream ({personalExpenses.length})
                  </CardTitle>
                  <CardDescription>
                    Chronological list of all logged personal non-room expenses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {personalExpenses.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No personal expenses logged yet. Use the form on the left to add one!
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                      {personalExpenses.map((exp: any) => (
                        <div key={exp.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-accent/40 transition-colors">
                          <div>
                            <p className="font-bold text-foreground text-sm">{exp.title}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="size-3" />
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

          {/* TAB 3: SETTINGS */}
          <TabsContent value="settings" className="space-y-6 max-w-2xl">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BadgeAlert className="size-5 text-amber-500" />
                  Personal Expenses Warning Limit Settings
                </CardTitle>
                <CardDescription className="text-xs">
                  Set a soft warning threshold for your personal budget limit. Visual alerts notify you when combined personal spending + room balance allocations pass this threshold.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveWarningLimit}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5 max-w-md">
                    <label className="text-xs font-semibold text-foreground">Personal Expenses Warning Limit (Rs.)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={warningInput || warningLimit}
                      onChange={(e) => setWarningInput(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Current threshold: <strong className="text-foreground">Rs. {warningLimit.toLocaleString()}</strong>
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 flex justify-end">
                  <Button size="sm" type="submit" disabled={updateProfileMutation.isPending} className="gap-2">
                    <Settings className="size-3.5" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Personal Limit Settings'}
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
