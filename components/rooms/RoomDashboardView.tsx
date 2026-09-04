'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { RoomDashboardData } from '@/lib/services/dashboard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Wallet,
  Receipt,
  Users,
  Scale,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  TrendingUp,
  PieChart,
  Activity,
  UserCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface RoomDashboardViewProps {
  roomId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: 'bg-emerald-500 text-emerald-500',
  Utilities: 'bg-sky-500 text-sky-500',
  Rent: 'bg-violet-500 text-violet-500',
  Food: 'bg-orange-500 text-orange-500',
  Entertainment: 'bg-pink-500 text-pink-500',
  General: 'bg-slate-500 text-slate-500',
  Other: 'bg-amber-500 text-amber-500',
};

const BAR_GRADIENTS = [
  'from-primary to-orange-500',
  'from-violet-500 to-indigo-500',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-yellow-500',
];

export function RoomDashboardView({ roomId }: RoomDashboardViewProps) {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<RoomDashboardData>({
    queryKey: ['room-dashboard', roomId],
    queryFn: () => apiClient.get<RoomDashboardData>(api.room.dashboard(roomId)),
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">
          Failed to load room dashboard. Please try again.
        </p>
      </div>
    );
  }

  const { room, stats, membersContribution, categoryBreakdown, recentActivity } = data;
  const isNetOwed = stats.userNetBalance > 0;
  const isNetOwes = stats.userNetBalance < 0;

  return (
    <div className="space-y-6">

      {/* ── Room Header & Quick Invite Action ─────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Room Dashboard
            </span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Active Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {room.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Invite Code */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyCode(room.inviteCode)}
            className="h-9 gap-1.5 text-xs font-medium border-border/80 hover:bg-accent"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-muted-foreground" />
                <span>Code: <strong className="font-mono text-foreground">{room.inviteCode}</strong></span>
              </>
            )}
          </Button>

          {/* Quick Add Expense Link */}
          <Link href={`/rooms/${roomId}/expenses`}>
            <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-sm">
              <Plus className="size-4" />
              <span>Add Expense</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Key Metrics Cards Grid ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">

        {/* 1. Total Room Expenses */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total Expenses
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Wallet className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            ${stats.totalExpensesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="font-medium text-foreground">{stats.totalExpensesCount}</span> recorded items
          </p>
        </div>

        {/* 2. Total Bills */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recurring Bills
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <Receipt className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            ${stats.totalBillsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="font-medium text-foreground">{stats.totalBillsCount}</span> active bills
          </p>
        </div>

        {/* 3. Your Net Balance Position */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Your Position
            </span>
            <div className={`flex size-7 items-center justify-center rounded-lg ${
              isNetOwed ? 'bg-emerald-500/10 text-emerald-500' : isNetOwes ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'
            }`}>
              {isNetOwed ? <ArrowDownLeft className="size-3.5" /> : isNetOwes ? <ArrowUpRight className="size-3.5" /> : <Scale className="size-3.5" />}
            </div>
          </div>
          <p className={`text-2xl font-bold tracking-tight ${
            isNetOwed ? 'text-emerald-500' : isNetOwes ? 'text-rose-500' : 'text-foreground'
          }`}>
            {isNetOwed ? `+$${stats.userNetBalance.toFixed(2)}` : isNetOwes ? `-$${Math.abs(stats.userNetBalance).toFixed(2)}` : '$0.00'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground font-medium">
            {isNetOwed ? 'You are owed' : isNetOwes ? 'You owe roommates' : 'All settled up'}
          </p>
        </div>

        {/* 4. Room Members */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Members
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Users className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {stats.memberCount}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <UserCheck className="size-3 text-emerald-500" />
            <span className="font-medium text-foreground">Roommates connected</span>
          </p>
        </div>
      </div>

      {/* ── Main Dashboard Analytics Section ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left Column (2 cols): Member Contribution Breakdown & Categories */}
        <div className="space-y-6 lg:col-span-2">

          {/* Member Spending Distribution Chart Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Member Contributions</h3>
                  <p className="text-xs text-muted-foreground">Who paid how much for this room</p>
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Total: ${(stats.totalExpensesAmount + stats.totalBillsAmount).toFixed(2)}
              </span>
            </div>

            {/* Visual Stacked Progress Bar */}
            {membersContribution.length > 0 && (stats.totalExpensesAmount + stats.totalBillsAmount) > 0 ? (
              <div className="space-y-5">
                {/* Stacked bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60">
                  {membersContribution.map((m, idx) => (
                    <div
                      key={m.userId}
                      style={{ width: `${Math.max(m.percentage, 2)}%` }}
                      className={`h-full bg-gradient-to-r ${BAR_GRADIENTS[idx % BAR_GRADIENTS.length]} transition-all duration-500`}
                      title={`${m.name}: $${m.totalPaid} (${m.percentage}%)`}
                    />
                  ))}
                </div>

                {/* Member legend & details list */}
                <div className="space-y-3 pt-1">
                  {membersContribution.map((m, idx) => (
                    <div key={m.userId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`size-3 shrink-0 rounded-full bg-gradient-to-r ${BAR_GRADIENTS[idx % BAR_GRADIENTS.length]}`} />
                        <span className="font-semibold text-foreground truncate">{m.name}</span>
                        <span className="text-muted-foreground text-[11px]">({m.percentage}%)</span>
                      </div>
                      <span className="font-bold font-mono text-foreground">${m.totalPaid.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No contributions logged in this room yet. Add expenses to see statistics!
              </div>
            )}
          </div>

          {/* Expense Category Breakdown Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                <PieChart className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Expense Categories</h3>
                <p className="text-xs text-muted-foreground">Spending distribution by category</p>
              </div>
            </div>

            {categoryBreakdown.length > 0 ? (
              <div className="space-y-3.5">
                {categoryBreakdown.map((c) => {
                  const colorClass = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.General;
                  const bgBarColor = colorClass.split(' ')[0];
                  return (
                    <div key={c.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{c.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-[11px]">{c.percentage}%</span>
                          <span className="font-mono font-semibold text-foreground">${c.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={`h-full ${bgBarColor} rounded-full transition-all duration-300`}
                          style={{ width: `${Math.max(c.percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No expense categories recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Recent Activity Stream & Shortcuts */}
        <div className="space-y-6">

          {/* Recent Activity Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Activity className="size-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              </div>
              <Link href={`/rooms/${roomId}/expenses`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2 hover:bg-primary/10">
                  View all
                </Button>
              </Link>
            </div>

            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((act) => {
                  const isExpense = act.type === 'expense';
                  return (
                    <div
                      key={`${act.type}-${act.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/30 p-2.5 transition-colors hover:bg-muted/60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs ${
                          isExpense ? 'bg-orange-500/10 text-orange-500' : 'bg-sky-500/10 text-sky-500'
                        }`}>
                          {isExpense ? <Wallet className="size-4" /> : <Receipt className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{act.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Paid by <strong className="font-medium text-foreground">{act.paidByName}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold font-mono text-foreground">${act.amount.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                          <Clock className="size-2.5" />
                          {formatDistanceToNow(new Date(act.date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No activity recorded yet in this room.
              </div>
            )}
          </div>

          {/* Room Quick Shortcuts Card */}
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Link href={`/rooms/${roomId}/expenses`} className="w-full">
                <Button variant="outline" className="w-full justify-between h-9 text-xs font-medium border-border/70 hover:border-primary">
                  <span className="flex items-center gap-2">
                    <Wallet className="size-3.5 text-orange-500" />
                    Record Expense
                  </span>
                  <Plus className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>
              <Link href={`/rooms/${roomId}/bills`} className="w-full">
                <Button variant="outline" className="w-full justify-between h-9 text-xs font-medium border-border/70 hover:border-primary">
                  <span className="flex items-center gap-2">
                    <Receipt className="size-3.5 text-sky-500" />
                    Create Bill
                  </span>
                  <Plus className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>
              <Link href={`/rooms/${roomId}/settlement`} className="w-full">
                <Button variant="outline" className="w-full justify-between h-9 text-xs font-medium border-border/70 hover:border-primary">
                  <span className="flex items-center gap-2">
                    <Scale className="size-3.5 text-emerald-500" />
                    Calculate Settlement
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
