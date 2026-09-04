'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
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
  Building2,
  CalendarClock,
  Users,
  Copy,
  Check,
  RefreshCw,
  Crown,
  UserCheck,
  UserX,
  ShieldAlert,
  Coins,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react';

export function RoomSettingsView() {
  const { roomId, userRole } = useCurrentRoom();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: room, isLoading: isRoomLoading } = useQuery({
    queryKey: ['room-detail', roomId],
    queryFn: () => apiClient.get<any>(api.room.detail(roomId)),
  });

  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['room-members', roomId],
    queryFn: () => apiClient.get<any[]>(api.room.members(roomId)),
  });

  // Local form states initialized from data
  const [roomName, setRoomName] = useState('');
  const [currency, setCurrency] = useState('Rs.');
  const [frequency, setFrequency] = useState('monthly');
  const [recurringDay, setRecurringDay] = useState(1);
  const [targetBudget, setTargetBudget] = useState(0);

  // Sync state when room details land
  const [isInitialized, setIsInitialized] = useState(false);
  if (room && !isInitialized) {
    setRoomName(room.name || '');
    setCurrency(room.currency || 'Rs.');
    setFrequency(room.settlement_frequency || 'monthly');
    setRecurringDay(room.recurring_settlement_day || 1);
    setTargetBudget(room.target_budget || 0);
    setIsInitialized(true);
  }

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.room.settings(roomId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
      queryClient.invalidateQueries({ queryKey: ['current-room', roomId] });
      queryClient.invalidateQueries({ queryKey: ['settlement', roomId] });
      toast.success('Room settings updated successfully!');
    },
  });

  const regenerateInviteMutation = useMutation({
    mutationFn: () => apiClient.post(api.room.regenerateInvite(roomId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
      toast.success('Invite code regenerated!');
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      apiClient.patch(api.room.updateMember(roomId, memberId), { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-members', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
      toast.success('Member role updated!');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiClient.delete(api.room.removeMember(roomId, memberId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-members', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-detail', roomId] });
      toast.success('Member removed from room');
    },
  });

  const isOwner = userRole === 'owner';
  const inviteCode = room?.invite_code || room?.join_code || '';
  const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/join?code=${inviteCode}` : '';

  function handleCopyInvite() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success('Invite code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSaveGeneral() {
    updateSettingsMutation.mutate({
      name: roomName,
      currency,
      target_budget: Number(targetBudget),
    });
  }

  function handleSaveSettlementSchedule() {
    updateSettingsMutation.mutate({
      settlement_frequency: frequency,
      recurring_settlement_day: Number(recurringDay),
    });
  }

  if (isRoomLoading || isMembersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Building2 className="size-6 text-primary" />
          Room Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure room details, settlement schedules, currency preferences, and member access roles.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="general" className="flex items-center gap-1.5">
            <Building2 className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="settlement" className="flex items-center gap-1.5">
            <CalendarClock className="size-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-1.5">
            <Users className="size-4" />
            Members ({members?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Room Information</CardTitle>
              <CardDescription>
                Basic details about this shared workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Room Name</label>
                <Input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  disabled={!isOwner}
                  placeholder="e.g. Baker Street Room 221B"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Coins className="size-4 text-primary" />
                    Currency Symbol
                  </label>
                  <Select
                    value={currency}
                    onValueChange={(val) => val && setCurrency(val)}
                    disabled={!isOwner}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rs.">Rs. (Nepalese Rupee / Indian Rupee)</SelectItem>
                      <SelectItem value="$">$ (USD - Dollar)</SelectItem>
                      <SelectItem value="€">€ (EUR - Euro)</SelectItem>
                      <SelectItem value="£">£ (GBP - British Pound)</SelectItem>
                      <SelectItem value="¥">¥ (JPY - Yen / Yuan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <PiggyBank className="size-4 text-primary" />
                    Monthly Budget Target ({currency})
                  </label>
                  <Input
                    type="number"
                    value={targetBudget}
                    onChange={(e) => setTargetBudget(Number(e.target.value))}
                    disabled={!isOwner}
                    placeholder="0 (Unlimited)"
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set a visual target threshold for total room spending.
                  </p>
                </div>
              </div>
            </CardContent>

            {isOwner && (
              <CardFooter className="border-t border-border pt-4 flex justify-end">
                <Button
                  onClick={handleSaveGeneral}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save General Changes'}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Invite Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Room Join & Invite Code
              </CardTitle>
              <CardDescription>
                Share this code with roommates so they can join this room.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted px-4 py-2.5 rounded-md font-mono text-lg tracking-widest font-bold text-center border border-border">
                  {inviteCode}
                </div>
                <Button variant="outline" onClick={handleCopyInvite} className="gap-1.5 shrink-0">
                  {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </Button>
              </div>

              {isOwner && (
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Regenerating invalidates current join code immediately.
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                        <RefreshCw className="size-3.5" />
                        Regenerate Code
                      </Button>
                    } />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate Room Invite Code?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The current code ({inviteCode}) will stop working. Anyone with the old code won't be able to join.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => regenerateInviteMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Regenerate Code
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Settlement Recurring Schedule */}
        <TabsContent value="settlement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarClock className="size-5 text-primary" />
                Recurring Settlement Schedule
              </CardTitle>
              <CardDescription>
                Define the recurring timeframe for closing bills and running room settlements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Settlement Frequency</label>
                  <Select
                    value={frequency}
                    onValueChange={(val) => val && setFrequency(val)}
                    disabled={!isOwner}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Cycle</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly (Every 2 Weeks)</SelectItem>
                      <SelectItem value="weekly">Weekly Cycle</SelectItem>
                      <SelectItem value="custom">Custom Manual Interval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Recurring Start Day of Month</label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={recurringDay}
                    onChange={(e) => setRecurringDay(Number(e.target.value))}
                    disabled={!isOwner || frequency === 'custom'}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g. Day 1 starts 1st of month. Day 25 starts 25th of month.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-accent/50 p-4 border border-border text-sm space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  Active Settlement Cycle Rules
                </span>
                <p className="text-xs text-muted-foreground">
                  When room owner closes a settlement period, the new open period automatically aligns with day{' '}
                  <span className="font-bold text-foreground">{recurringDay}</span> of every{' '}
                  <span className="font-bold text-foreground">{frequency}</span> cycle.
                </p>
              </div>
            </CardContent>

            {isOwner && (
              <CardFooter className="border-t border-border pt-4 flex justify-end">
                <Button
                  onClick={handleSaveSettlementSchedule}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Schedule Settings'}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Tab 3: Room Members & Roles */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Room Members ({members?.length})
              </CardTitle>
              <CardDescription>
                Manage member access rights and administrative ownership roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {members?.map((m: any) => {
                  const isMemberOwner = m.role === 'owner';
                  const u = m.users;
                  const displayName = u?.name || 'Room Member';
                  const displayEmail = u?.email || '';

                  return (
                    <div key={m.id || m.user_id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                            {displayName}
                            {isMemberOwner && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                <Crown className="size-3" /> Owner
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                        </div>
                      </div>

                      {/* Role management controls */}
                      {isOwner && !isMemberOwner && (
                        <div className="flex items-center gap-2 shrink-0">
                          <AlertDialog>
                            <AlertDialogTrigger render={
                              <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 dark:text-amber-400">
                                <Crown className="size-3.5" />
                                Transfer Owner
                              </Button>
                            } />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Transfer Room Ownership?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Make {displayName} the primary room owner. You will become a regular room member.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    updateMemberRoleMutation.mutate({
                                      memberId: u?.id || m.user_id,
                                      role: 'owner',
                                    })
                                  }
                                >
                                  Transfer Ownership
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger render={
                              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                                <UserX className="size-4" />
                              </Button>
                            } />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {displayName} from Room?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  They will lose access to bills, products, and settlement details for this room.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMemberMutation.mutate(u?.id || m.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove Member
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
