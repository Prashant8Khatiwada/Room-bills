'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function JoinRoomDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const queryClient = useQueryClient();

  const joinMutation = useMutation({
    mutationFn: (code: string) => apiClient.post(api.room.join, { inviteCode: code }),
    onSuccess: () => {
      toast.success('Joined room successfully!');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setInviteCode('');
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to join room');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    joinMutation.mutate(inviteCode.trim());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) || (
            <Button variant="outline" className="gap-2">
              <LogIn className="h-4 w-4" /> Join Room
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join an Existing Room</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by the room owner to join their room.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground">Invite Code</label>
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. BAKER221"
              className="mt-1 font-mono uppercase"
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={joinMutation.isPending}>
              {joinMutation.isPending ? 'Joining...' : 'Join Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
