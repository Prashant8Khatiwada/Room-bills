'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useCurrentRoom } from '@/components/rooms/CurrentRoomProvider';
import { apiClient } from '@/lib/apiClient';
import { api } from '@/lib/apiEndpoints';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Search, FileText, CheckCircle2, Trash2, PlusCircle, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const { roomId } = useCurrentRoom();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['bill-logs', roomId],
    queryFn: () => apiClient.get<any[]>(`${api.bill.list(roomId)}?logs=true`),
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      const matchesSearch =
        !searchTerm ||
        log.details?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction =
        actionFilter === 'all' ||
        (actionFilter === 'paid' && log.action === 'paid_bill') ||
        (actionFilter === 'deleted' && log.action === 'deleted_bill') ||
        (actionFilter === 'template' && log.action.includes('template'));

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  function getActionBadge(action: string) {
    switch (action) {
      case 'paid_bill':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="size-3" /> Paid Bill
          </span>
        );
      case 'deleted_bill':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive border border-destructive/20">
            <Trash2 className="size-3" /> Deleted Bill
          </span>
        );
      case 'created_template':
      case 'approved_template':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
            <PlusCircle className="size-3" /> Template
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            <FileText className="size-3" /> {action}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary flex items-center gap-1">
              <History className="size-3.5" /> Room History
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Room Audit Logs</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete timeline log of every bill payment, deletion, and template modification in this room.
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, action, or user name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={actionFilter} onValueChange={(val) => val && setActionFilter(val)}>
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Filter action" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Actions</SelectItem>
              <SelectItem value="paid" className="text-xs">Bill Payments</SelectItem>
              <SelectItem value="deleted" className="text-xs">Bill Deletions</SelectItem>
              <SelectItem value="template" className="text-xs">Template Actions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline View */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-8 text-center border-dashed rounded-2xl">
          <CardHeader className="flex flex-col items-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <History className="size-6" />
            </div>
            <CardTitle className="text-base font-bold text-foreground">No audit logs found</CardTitle>
            <CardDescription className="text-xs">
              {searchTerm || actionFilter !== 'all'
                ? 'Try clearing your search or action filter.'
                : 'All room actions and bill payments will be recorded here.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="relative border-l-2 border-border/60 ml-4 space-y-4 pl-6 pt-1">
          {filteredLogs.map((log) => (
            <div key={log.id} className="relative group">
              <div className="absolute -left-[31px] top-1.5 size-3.5 rounded-full border-2 border-background bg-primary ring-4 ring-background" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <span className="text-xs font-bold text-foreground">
                      {log.details?.title || 'Bill Entry'}
                    </span>
                    {log.details?.amount && (
                      <span className="font-mono text-xs font-extrabold text-primary">
                        NPR {Number(log.details.amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Performed by <strong className="text-foreground">{log.user_name || 'Room Member'}</strong>
                  </p>
                </div>

                <div className="text-[11px] font-medium text-muted-foreground/80 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
