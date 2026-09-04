'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PiggyBank, Coins, AlertCircle } from 'lucide-react';

interface AllocateBalanceModalProps {
  roomId: string;
  roomName: string;
  minRequired: number;
  currentAllocated: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllocateBalanceModal({
  roomId,
  roomName,
  minRequired,
  currentAllocated,
  open,
  onOpenChange,
}: AllocateBalanceModalProps) {
  const queryClient = useQueryClient();
  const [allocationInput, setAllocationInput] = useState(String(currentAllocated || minRequired));

  // Query user global profile
  const { data: userSummary } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<any>(api.user.profile),
    enabled: open,
  });

  const allocateMutation = useMutation({
    mutationFn: (amount: number) =>
      apiClient.post(api.room.allocateBalance(roomId), { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-dashboard', roomId] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['room-members', roomId] });
      toast.success('Room balance allocation updated!');
      onOpenChange(false);
    },
  });

  const unallocated = userSummary?.unallocatedBalance || 0;
  const targetAmount = Number(allocationInput || 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (minRequired > 0 && targetAmount < minRequired) {
      return toast.error(`Allocation must be at least Rs. ${minRequired.toFixed(2)} for this room.`);
    }

    allocateMutation.mutate(targetAmount);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="size-5 text-primary" />
            Manage Room Fund Allocation
          </DialogTitle>
          <DialogDescription>
            Allocate funds from your global wallet to <strong className="text-foreground">{roomName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Unallocated wallet banner */}
          <div className="rounded-lg bg-accent/60 p-3 border border-border text-xs flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <Coins className="size-4 text-primary" /> Unallocated Global Wallet:
            </span>
            <span className="font-extrabold text-foreground">Rs. {unallocated.toFixed(2)}</span>
          </div>

          {minRequired > 0 && (
            <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Room Owner Minimum Requirement: <strong>Rs. {minRequired.toFixed(2)}</strong>.
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Allocated Room Balance (Rs.)</label>
            <Input
              type="number"
              min={minRequired}
              step="0.01"
              value={allocationInput}
              onChange={(e) => setAllocationInput(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={allocateMutation.isPending}
            >
              {allocateMutation.isPending ? 'Updating...' : 'Save Allocation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
