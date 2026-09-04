import { createClient } from '@/lib/supabase/server';
import { assertRoomMember } from './rooms';
import fs from 'fs';
import path from 'path';

export interface AuditLogItem {
  id: string;
  room_id: string;
  user_id: string;
  action: 'paid_bill' | 'deleted_bill' | 'created_template' | 'approved_template' | 'deleted_template';
  userName: string;
  userEmail: string;
  title: string;
  amount?: number;
  month?: string;
  created_at: string;
}

const FALLBACK_LOGS_FILE = path.join(process.cwd(), '.room_audit_logs.json');

function getFallbackLogs(roomId: string): AuditLogItem[] {
  try {
    if (fs.existsSync(FALLBACK_LOGS_FILE)) {
      const content = fs.readFileSync(FALLBACK_LOGS_FILE, 'utf-8');
      const data = JSON.parse(content);
      return (data[roomId] || []).sort(
        (a: AuditLogItem, b: AuditLogItem) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  } catch (err) {
    console.warn('[AuditLogs] Error reading file logs:', err);
  }
  return [];
}

function saveFallbackLog(roomId: string, log: AuditLogItem) {
  try {
    let data: Record<string, AuditLogItem[]> = {};
    if (fs.existsSync(FALLBACK_LOGS_FILE)) {
      const content = fs.readFileSync(FALLBACK_LOGS_FILE, 'utf-8');
      data = JSON.parse(content);
    }
    if (!data[roomId]) data[roomId] = [];
    
    // Avoid duplicate fallback entries
    const exists = data[roomId].some((item) => item.id === log.id);
    if (!exists) {
      data[roomId].unshift(log);
      fs.writeFileSync(FALLBACK_LOGS_FILE, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.warn('[AuditLogs] Error saving file log:', err);
  }
}

export async function recordAuditLog(
  roomId: string,
  userId: string,
  action: AuditLogItem['action'],
  details: { title: string; amount?: number; month?: string }
): Promise<void> {
  const supabase = await createClient();

  // Fetch human name of user
  const { data: userObj } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .single();

  const userName = userObj?.name || userObj?.email?.split('@')[0] || 'Room Member';
  const userEmail = userObj?.email || '';

  const logItem: AuditLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    room_id: roomId,
    user_id: userId,
    action,
    userName,
    userEmail,
    title: details.title,
    amount: details.amount,
    month: details.month,
    created_at: new Date().toISOString(),
  };

  // 1. Save to local fallback store (guaranteed persistence)
  saveFallbackLog(roomId, logItem);

  // 2. Try DB insert
  try {
    await supabase.from('bill_logs').insert({
      id: logItem.id,
      room_id: roomId,
      user_id: userId,
      action: action,
      details: {
        userName,
        userEmail,
        title: details.title,
        amount: details.amount,
        month: details.month,
      },
      created_at: logItem.created_at,
    });
  } catch (err) {
    console.warn('[AuditLogs] DB insert fallback:', err);
  }
}

export async function listAuditLogs(roomId: string, userId: string): Promise<AuditLogItem[]> {
  await assertRoomMember(roomId, userId);
  const supabase = await createClient();

  const fallbackList = getFallbackLogs(roomId);

  try {
    const { data: dbLogs, error } = await supabase
      .from('bill_logs')
      .select('*, users:user_id(id, name, email)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });

    if (!error && dbLogs && dbLogs.length > 0) {
      const formattedDbLogs: AuditLogItem[] = dbLogs.map((l: any) => ({
        id: l.id,
        room_id: l.room_id,
        user_id: l.user_id,
        action: l.action || 'paid_bill',
        userName: l.users?.name || l.details?.userName || l.users?.email?.split('@')[0] || 'Room Member',
        userEmail: l.users?.email || l.details?.userEmail || '',
        title: l.details?.name || l.details?.title || 'Bill Item',
        amount: l.details?.amount,
        month: l.details?.month,
        created_at: l.created_at,
      }));

      // Combine DB & fallback logs without duplicates
      const logMap = new Map<string, AuditLogItem>();
      formattedDbLogs.forEach((l) => logMap.set(l.id, l));
      fallbackList.forEach((l) => {
        if (!logMap.has(l.id)) logMap.set(l.id, l);
      });

      return Array.from(logMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  } catch (err) {
    console.warn('[AuditLogs] Fetch error, using fallback:', err);
  }

  return fallbackList;
}
