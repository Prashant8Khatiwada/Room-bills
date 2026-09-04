'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { CreateRoomDialog } from '@/components/rooms/CreateRoomDialog';
import { JoinRoomDialog } from '@/components/rooms/JoinRoomDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  LogOut,
  ArrowRight,
  Copy,
  Check,
  Home,
  Users,
  Hash,
  PlusCircle,
} from 'lucide-react';
import { useState } from 'react';

export default function GlobalDashboardPage() {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: userMe } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiClient.get<any[]>(api.room.list),
  });

  async function handleLogout() {
    await apiClient.post(api.auth.logout);
    router.push('/login');
  }

  function handleCopyInvite(code: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const userName = userMe?.user?.name || userMe?.user?.email || 'User';
  const firstName = userName.split(' ')[0];
  const userInitials = userName.substring(0, 2).toUpperCase();
  const roomCount = rooms?.length ?? 0;

  // Colour palette for room cards
  const cardAccents = [
    'from-orange-400/20 to-red-400/10 border-orange-300/40',
    'from-violet-400/20 to-purple-400/10 border-violet-300/40',
    'from-sky-400/20 to-blue-400/10 border-sky-300/40',
    'from-emerald-400/20 to-teal-400/10 border-emerald-300/40',
    'from-pink-400/20 to-rose-400/10 border-pink-300/40',
    'from-amber-400/20 to-yellow-400/10 border-amber-300/40',
  ];

  const iconBgs = [
    'bg-orange-500',
    'bg-violet-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-pink-500',
    'bg-amber-500',
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">

      {/* ── Top Navigation Bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 h-14 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4 sm:px-6">

          {/* Left — brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">Room Ledger</span>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <div className="hidden sm:flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 text-[11px] font-semibold text-muted-foreground">
              <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[9px]">
                {userInitials}
              </div>
              {firstName}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Page Body ──────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">

        {/* Hero greeting */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1">Dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your shared living expenses across all your rooms.
          </p>
        </div>

        {/* Stats row */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Home className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rooms</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? '—' : roomCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <Users className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? '—' : roomCount}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Hash className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Member</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">{firstName}</p>
          </div>
        </div>

        {/* Section header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Your Rooms</h2>
            <p className="text-xs text-muted-foreground">Click a room to manage bills & expenses</p>
          </div>
          <div className="flex items-center gap-2">
            <JoinRoomDialog />
            <CreateRoomDialog />
          </div>
        </div>

        {/* Room grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : !rooms || rooms.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
              <PlusCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No rooms yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Create your first room to start splitting bills with roommates, or join one with an invite code.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <CreateRoomDialog />
              <JoinRoomDialog />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r, idx) => {
              const accent = cardAccents[idx % cardAccents.length];
              const iconBg = iconBgs[idx % iconBgs.length];
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`group relative text-left w-full rounded-2xl border bg-gradient-to-br ${accent} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  onClick={() => router.push(`/rooms/${r.id}/bills`)}
                >
                  {/* Room icon + name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} text-white font-bold text-base shadow-sm`}>
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight truncate">
                        {r.name}
                      </h3>
                      <span className="text-[11px] text-muted-foreground">Active workspace</span>
                    </div>
                  </div>

                  {/* Invite code */}
                  {r.invite_code && (
                    <div
                      className="flex items-center justify-between rounded-lg bg-background/60 border border-border/40 px-3 py-2 mb-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Invite
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyInvite(r.invite_code, e)}
                        className="flex items-center gap-1.5 font-mono font-bold text-[12px] text-foreground hover:text-primary transition-colors"
                        title="Copy invite code"
                      >
                        {r.invite_code}
                        {copiedId === r.invite_code ? (
                          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Footer row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      Open room →
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
