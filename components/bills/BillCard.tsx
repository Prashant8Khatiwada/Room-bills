'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export interface BillCardProps {
  id?: string;
  name?: string;
  type: string;
  amount: number;
  month: string;
  paidByName: string;
  prevUnit?: number;
  currentUnit?: number;
  ratePerUnit?: number;
  billSplits?: Array<{ user_id: string; share: number; user_name?: string }>;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
}

export function BillCard({
  id,
  name,
  type,
  amount,
  month,
  paidByName,
  prevUnit,
  currentUnit,
  ratePerUnit,
  billSplits,
  canDelete,
  isDeleting,
  onDelete,
}: BillCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const displayTitle = name || type;

  function handleConfirmDelete() {
    if (onDelete) {
      onDelete();
    }
  }

  return (
    <>
      <Card className="rounded-2xl border border-border/70 shadow-xs relative">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-base capitalize font-bold text-foreground">{displayTitle}</CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Paid by {paidByName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold font-mono text-primary">NPR {amount?.toLocaleString()}</span>
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmOpen(true)}
                disabled={isDeleting}
                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete bill"
              >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-muted-foreground pt-0">
          <div className="text-[11px]">Month: <span className="font-semibold text-foreground">{month}</span></div>
          {type === 'electricity' && prevUnit !== undefined && currentUnit !== undefined && (
            <div className="text-[11px] font-mono bg-sky-500/10 border border-sky-500/20 text-sky-600 rounded-md px-2 py-1 inline-block">
              Units: {prevUnit} → {currentUnit} (@ NPR {ratePerUnit}/unit)
            </div>
          )}

          {/* Split Shares Breakdown */}
          {billSplits && billSplits.length > 0 && (
            <div className="border-t border-border/40 pt-2 mt-2">
              <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wider">Split Breakdown ({billSplits.length} members)</p>
              <div className="flex flex-wrap gap-1.5">
                {billSplits.map((s, idx) => (
                  <span key={s.user_id || idx} className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-foreground border border-border/50">
                    <span>{s.user_name || 'Member'}:</span>
                    <strong className="font-mono text-primary">NPR {s.share.toLocaleString()}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Popup Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold">Delete Logged Bill?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete <strong className="text-foreground">{displayTitle} (NPR {amount?.toLocaleString()})</strong>? This action will update settlement balances and be recorded in the audit log.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
              className="h-8 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                handleConfirmDelete();
                setConfirmOpen(false);
              }}
              disabled={isDeleting}
              className="h-8 text-xs font-bold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Deleting...
                </>
              ) : (
                'Delete Bill'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
