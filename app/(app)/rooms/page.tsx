'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { CreateRoomDialog } from '@/components/rooms/CreateRoomDialog';
import { JoinRoomDialog } from '@/components/rooms/JoinRoomDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  ArrowRight,
  Copy,
  Check,
  Home,
  Users,
  Hash,
  PlusCircle,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { RoomAppShell } from '@/components/rooms/RoomAppShell';

export default function RoomsListPage() {
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

  function handleCopyInvite(code: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const userName = userMe?.user?.name || userMe?.user?.email || 'User';
  const firstName = userName.split(' ')[0];
  const roomCount = rooms?.length ?? 0;

  // Colour palette for room cards
  const cardAccents = [
    'from-orange-500/10 via-card to-card border-orange-500/30 hover:border-orange-500/60',
    'from-violet-500/10 via-card to-card border-violet-500/30 hover:border-violet-500/60',
    'from-sky-500/10 via-card to-card border-sky-500/30 hover:border-sky-500/60',
    'from-emerald-500/10 via-card to-card border-emerald-500/30 hover:border-emerald-500/60',
    'from-pink-500/10 via-card to-card border-pink-500/30 hover:border-pink-500/60',
    'from-amber-500/10 via-card to-card border-amber-500/30 hover:border-amber-500/60',
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
    <RoomAppShell>
      <div className="space-y-6">

        {/* Hero greeting */}
        <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1 flex items-center gap-1">
              <Sparkles className="size-3" />
              Workspace Hub
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Select a room to access its dedicated dashboard, bills, and expense reports.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <JoinRoomDialog />
            <CreateRoomDialog />
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Home className="size-3.5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Joined Rooms</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? '—' : roomCount}</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <Users className="size-3.5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active Spaces</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{isLoading ? '—' : roomCount}</p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Hash className="size-3.5" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Account Profile</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">{userName}</p>
          </div>
        </div>

        {/* Section header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <LayoutDashboard className="size-4 text-primary" />
              Your Rooms
            </h2>
            <p className="text-xs text-muted-foreground">Click any room card below to view its live room dashboard</p>
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
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-dashed border-border p-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <PlusCircle className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No rooms joined yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mb-6">
              Create your room or enter an invite code to start tracking shared expenses with roomies.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <CreateRoomDialog />
              <JoinRoomDialog />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r, idx) => {
              const accent = cardAccents[idx % cardAccents.length];
              const iconBg = iconBgs[idx % iconBgs.length];
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`group relative text-left w-full rounded-2xl border bg-gradient-to-br ${accent} p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                  onClick={() => router.push(`/rooms/${r.id}/dashboard`)}
                >
                  {/* Room icon + name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg} text-white font-bold text-base shadow-sm`}>
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="font-bold text-foreground text-base leading-tight truncate group-hover:text-primary transition-colors">
                        {r.name}
                      </h3>
                      <span className="text-[11px] text-muted-foreground font-medium">Click to open dashboard</span>
                    </div>
                  </div>

                  {/* Invite code */}
                  {r.invite_code && (
                    <div
                      className="flex items-center justify-between rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 px-3 py-2 mb-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Invite Code
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyInvite(r.invite_code, e)}
                        className="flex items-center gap-1.5 font-mono font-bold text-[12px] text-foreground hover:text-primary transition-colors"
                        title="Copy invite code"
                      >
                        {r.invite_code}
                        {copiedId === r.invite_code ? (
                          <Check className="size-3 text-emerald-500 shrink-0" />
                        ) : (
                          <Copy className="size-3 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Footer row */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-3">
                    <span className="text-[12px] font-semibold text-primary group-hover:underline">
                      View Room Dashboard
                    </span>
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <ArrowRight className="size-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </RoomAppShell>
  );
}
