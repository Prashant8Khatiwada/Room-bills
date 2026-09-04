'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { RoomDashboardData } from '@/lib/services/dashboard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AllocateBalanceModal } from './AllocateBalanceModal';
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
  PiggyBank,
  AlertTriangle,
  Coins,
  Crown,
  Filter,
} from 'lucide-react';
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
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);

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
  const currency = room.currency || 'Rs.';

  // Filter members or activity if member filter selected
  const displayedMembers = selectedMemberFilter === 'all'
    ? membersContribution
    : membersContribution.filter((m) => m.userId === selectedMemberFilter);

  const displayedActivity = selectedMemberFilter === 'all'
    ? recentActivity
    : recentActivity.filter((act) => {
        const matchingMember = membersContribution.find((m) => m.userId === selectedMemberFilter);
        return matchingMember && act.paidByName.toLowerCase().includes(matchingMember.name.toLowerCase());
      });

  const currentUserContribution = membersContribution.find((m) => m.userId === selectedMemberFilter) || membersContribution[0];

  return (
    <div className="space-y-6">

      {/* ── Room Header & Quick Actions ───────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Live Room Command Center
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Live Common Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {room.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Member Common Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select
              value={selectedMemberFilter}
              onValueChange={(val) => val && setSelectedMemberFilter(val)}
            >
              <SelectTrigger className="h-7 border-none shadow-none text-xs font-semibold focus:ring-0 p-0">
                <SelectValue placeholder="Filter member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Room Members (Common View)</SelectItem>
                {membersContribution.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* Allocate Funds Button */}
          <Button
            size="sm"
            onClick={() => setAllocateModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold shadow-sm bg-primary hover:bg-primary/90"
          >
            <PiggyBank className="size-4" />
            <span>Manage Allocation</span>
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Cards Grid ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">

        {/* 1. Total Common Room Fund Pool */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/5 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total Room Vault Pool
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Coins className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">
            {currency} {stats.totalRoomPool.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sum of all roommate allocations
          </p>
        </div>

        {/* 2. Total Room Expenses */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total Room Spend
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Wallet className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">
            {currency} {(stats.totalExpensesAmount + stats.totalBillsAmount).toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="font-medium text-foreground">{stats.totalExpensesCount + stats.totalBillsCount}</span> items recorded
          </p>
        </div>

        {/* 3. Room Min Requirement */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Min Room Req.
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <PiggyBank className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">
            {currency} {room.minBalanceRequired.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Per member requirement
          </p>
        </div>

        {/* 4. Room Members Count */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Room Members
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Users className="size-3.5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">
            {stats.memberCount}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <UserCheck className="size-3 text-emerald-500" />
            <span className="font-medium text-foreground">Active roommates</span>
          </p>
        </div>
      </div>

      {/* ── Main Dashboard Analytics Section ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left Column (2 cols): Member Contribution & Fund Allocation Leaderboard */}
        <div className="space-y-6 lg:col-span-2">

          {/* Member Fund Allocation & Contribution Leaderboard */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Roommate Fund Allocations & Solvency</h3>
                  <p className="text-xs text-muted-foreground">Live allocated room balances vs minimum criteria</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border border border-border rounded-xl bg-card overflow-hidden">
              {displayedMembers.map((m, idx) => {
                const isLowBalance = room.minBalanceRequired > 0 && m.allocatedBalance < room.minBalanceRequired;
                const isTopPayer = idx === 0 && m.totalPaid > 0;

                return (
                  <div key={m.userId} className="p-3.5 flex items-center justify-between gap-4 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-9 rounded-full bg-gradient-to-r ${BAR_GRADIENTS[idx % BAR_GRADIENTS.length]} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm`}>
                        {m.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                          {isTopPayer && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Crown className="size-3" /> Top Payer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Paid {currency} {m.totalPaid.toFixed(2)} ({m.percentage}% of room spend)
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm font-extrabold text-foreground">
                        {currency} {m.allocatedBalance.toFixed(2)}
                      </p>
                      <div>
                        {isLowBalance ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <AlertTriangle className="size-3" /> Low Balance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Solvent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
                          <span className="font-mono font-semibold text-foreground">{currency} {c.amount.toFixed(2)}</span>
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
              <Link href={`/rooms/${roomId}/bills`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2 hover:bg-primary/10">
                  View all
                </Button>
              </Link>
            </div>

            {displayedActivity.length > 0 ? (
              <div className="space-y-3">
                {displayedActivity.map((act) => {
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
                        <p className="text-xs font-bold font-mono text-foreground">{currency} {act.amount.toFixed(2)}</p>
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
                No activity recorded yet for selected filter.
              </div>
            )}
          </div>

          {/* Quick Shortcuts Card */}
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Link href={`/personal`} className="w-full">
                <Button variant="outline" className="w-full justify-between h-9 text-xs font-medium border-border/70 hover:border-primary">
                  <span className="flex items-center gap-2">
                    <Wallet className="size-3.5 text-violet-500" />
                    Personal Global Wallet
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>
              <Link href={`/rooms/${roomId}/bills`} className="w-full">
                <Button variant="outline" className="w-full justify-between h-9 text-xs font-medium border-border/70 hover:border-primary">
                  <span className="flex items-center gap-2">
                    <Receipt className="size-3.5 text-sky-500" />
                    Record Expense or Bill
                  </span>
                  <Plus className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>
              <Link href={`/rooms/${roomId}/settlement`} className="w-full">
                <Button variant="outline" className="w-full justify-between h-9 text-xs font-medium border-border/70 hover:border-primary">
                  <span className="flex items-center gap-2">
                    <Scale className="size-3.5 text-emerald-500" />
                    View Debt Settlement
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </Button>
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* Allocate Modal */}
      <AllocateBalanceModal
        roomId={roomId}
        roomName={room.name}
        minRequired={room.minBalanceRequired}
        currentAllocated={currentUserContribution?.allocatedBalance || 0}
        open={allocateModalOpen}
        onOpenChange={setAllocateModalOpen}
      />
    </div>
  );
}
