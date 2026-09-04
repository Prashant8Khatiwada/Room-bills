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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Receipt,
  Plus,
  TrendingDown,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export default function PersonalExpensesPage() {
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>(api.user.profile),
  });

  const [expenseTitleInput, setExpenseTitleInput] = useState('');
  const [expenseAmountInput, setExpenseAmountInput] = useState('');

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

  return (
    <RoomAppShell>
      <div className="space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="size-7 text-primary" />
              Personal Expenses Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Log individual personal expenses outside of shared room bills.
            </p>
          </div>
        </div>

        {/* Warning Alert if triggered */}
        {isWarningTriggered && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm">Warning: Budget Limit Reached</p>
              <p>
                Your overall spending is exceeding your set warning limit of Rs. {warningLimit.toFixed(2)}.
              </p>
            </div>
          </div>
        )}

        {/* Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Personal Spending</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <TrendingDown className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground">
              Rs. {totalPersonalSpent.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{personalExpenses.length} personal entries logged</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Soft Warning Limit</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <AlertTriangle className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-foreground">
              Rs. {warningLimit.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Configurable limit threshold</p>
          </div>
        </div>

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

          {/* Stream */}
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
                  No personal expenses logged yet.
                </div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
                  {personalExpenses.map((exp: any) => (
                    <div key={exp.id} className="p-3 flex items-center justify-between text-xs hover:bg-accent/40 transition-colors">
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

      </div>
    </RoomAppShell>
  );
}
