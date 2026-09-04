'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { RoomAppShell } from '@/components/rooms/RoomAppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Home,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  CreditCard,
  Building2,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';

export default function GlobalDashboardPage() {
  const router = useRouter();

  const { data: userMe, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<any[]>(api.room.list),
  });

  const { data: personalSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['personal-summary'],
    queryFn: () => apiClient.get<any>('/api/user/profile'),
  });

  const userName = userMe?.user?.name || userMe?.user?.email || 'User';
  const firstName = userName.split(' ')[0];
  const roomCount = rooms?.length ?? 0;

  const totalIncome = personalSummary?.total_income ?? userMe?.user?.total_income ?? 0;
  const totalLoans = personalSummary?.total_loans ?? 0;
  const totalAllocated = personalSummary?.total_allocated ?? 0;
  const totalPersonalExpenses = personalSummary?.total_personal_expenses ?? 0;
  const totalSpent = totalAllocated + totalPersonalExpenses;
  const warningLimit = personalSummary?.warning_limit ?? userMe?.user?.warning_limit ?? 0;
  const disposableBalance = totalIncome + totalLoans - totalSpent;
  const isOverWarning = warningLimit > 0 && totalSpent > warningLimit;

  const isLoading = userLoading || roomsLoading || summaryLoading;

  return (
    <RoomAppShell>
      <div className="space-y-6">

        {/* Hero Banner */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1 flex items-center gap-1">
              <Sparkles className="size-3" />
              Global Financial Control Center
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Here is your overall personal financial summary across incomes, loans, room allocations, and individual expenses.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/rooms">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Home className="size-3.5" />
                All Rooms ({roomCount})
              </Button>
            </Link>
            <Link href="/personal">
              <Button size="sm" className="gap-2 text-xs">
                <Wallet className="size-3.5" />
                Manage Personal Wallet
              </Button>
            </Link>
          </div>
        </div>

        {/* Warning Alert if over spending limit */}
        {isOverWarning && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-semibold">Spending Warning Limit Exceeded!</p>
              <p className="text-muted-foreground">
                Your combined spending (${totalSpent.toFixed(2)}) has passed your warning limit threshold (${warningLimit.toFixed(2)}).
              </p>
            </div>
            <Link href="/personal">
              <Button variant="outline" size="sm" className="border-amber-500/40 hover:bg-amber-500/20 text-xs">
                Adjust Wallet
              </Button>
            </Link>
          </div>
        )}

        {/* Core Financial Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Total Incomes */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Income</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? <Skeleton className="h-8 w-24" /> : `$${totalIncome.toFixed(2)}`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Personal income sources</p>
          </div>

          {/* Active Loans */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active Loans</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <CreditCard className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isLoading ? <Skeleton className="h-8 w-24" /> : `$${totalLoans.toFixed(2)}`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Borrowed funds tracker</p>
          </div>

          {/* Room Allocations */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Room Allocations</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                <Building2 className="size-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">
              {isLoading ? <Skeleton className="h-8 w-24" /> : `$${totalAllocated.toFixed(2)}`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Committed to rooms</p>
          </div>

          {/* Net Disposable Balance */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Disposable Balance</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSign className="size-4" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${disposableBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {isLoading ? <Skeleton className="h-8 w-24" /> : `$${disposableBalance.toFixed(2)}`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Available liquidity</p>
          </div>

        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">

          {/* All Rooms Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Home className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">All Rooms Workspace</h3>
                  <p className="text-xs text-muted-foreground">Manage your shared room spaces, invite roomies & track bills</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You are currently associated with <strong className="text-foreground">{roomCount} room{roomCount === 1 ? '' : 's'}</strong>.
              </p>
            </div>

            <Link href="/rooms" className="w-full">
              <Button variant="outline" className="w-full justify-between text-xs">
                <span>View All Rooms</span>
                <ArrowUpRight className="size-4 text-primary" />
              </Button>
            </Link>
          </div>

          {/* Personal Financial Wallet Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Personal Wallet & Expenses</h3>
                  <p className="text-xs text-muted-foreground">Manage incomes, loan records, warning limits & personal bills</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-border/50 pt-3">
                <span className="text-muted-foreground">Personal Expenses Logged:</span>
                <span className="font-bold text-foreground">${totalPersonalExpenses.toFixed(2)}</span>
              </div>
            </div>

            <Link href="/personal" className="w-full">
              <Button variant="outline" className="w-full justify-between text-xs">
                <span>Open Income & Loan Wallet</span>
                <ArrowUpRight className="size-4 text-violet-500" />
              </Button>
            </Link>
          </div>

        </div>

      </div>
    </RoomAppShell>
  );
}


