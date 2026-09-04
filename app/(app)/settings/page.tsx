'use client';

import { useState, useEffect } from 'react';
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
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  Settings,
  User,
  Shield,
  BadgeAlert,
  Bell,
  Palette,
  Save,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GlobalSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userMe, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<any>(api.auth.me),
  });

  const { data: profileSummary, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>(api.user.profile),
  });

  const [userName, setUserName] = useState('');
  const [warningLimit, setWarningLimit] = useState('');

  useEffect(() => {
    if (userMe?.user?.name) {
      setUserName(userMe.user.name);
    }
    if (profileSummary?.warning_limit !== undefined) {
      setWarningLimit(String(profileSummary.warning_limit));
    }
  }, [userMe, profileSummary]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(api.user.profile, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Global settings updated successfully!');
    },
  });

  async function handleLogout() {
    await apiClient.post(api.auth.logout);
    router.push('/login');
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: userName.trim() || undefined,
      warning_limit: warningLimit ? Number(warningLimit) : 0,
    });
  }

  const isLoading = userLoading || profileLoading;

  if (isLoading) {
    return (
      <RoomAppShell>
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </RoomAppShell>
    );
  }

  return (
    <RoomAppShell>
      <div className="space-y-6 max-w-3xl">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="size-7 text-primary" />
              Global Application Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal profile, global financial thresholds, appearance, and security.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">

          {/* Profile Details */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <User className="size-4 text-primary" />
                Account Profile Details
              </CardTitle>
              <CardDescription>
                Your public display name and account credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Name</label>
                  <Input
                    placeholder="Your Name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <Input
                    disabled
                    value={userMe?.user?.email || ''}
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Spending Threshold */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BadgeAlert className="size-4 text-amber-500" />
                Financial Spending Thresholds
              </CardTitle>
              <CardDescription>
                Configure soft spending limit alerts for personal and room expenses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5 max-w-sm">
                <label className="text-xs font-semibold text-foreground">Global Soft Warning Limit (Rs.)</label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={warningLimit}
                  onChange={(e) => setWarningLimit(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Triggers visual warning banners when total expenses pass this threshold.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Theme & Appearance */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Palette className="size-4 text-violet-500" />
                Appearance & Preferences
              </CardTitle>
              <CardDescription>
                Toggle application color mode.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Dark / Light Mode Theme</p>
                <p className="text-[11px] text-muted-foreground">Switch color preference for your workspace interface</p>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-xs"
            >
              <LogOut className="size-3.5" />
              Logout Account
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={updateProfileMutation.isPending}
              className="gap-2"
            >
              <Save className="size-4" />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

        </form>

      </div>
    </RoomAppShell>
  );
}
