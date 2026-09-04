import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { listBills, createBill, deleteBill, listBillLogs } from '@/lib/services/bills';
import { moneyAmount } from '@/lib/validations';
import { ok, err } from '@/lib/apiHelpers';

const electricitySchema = z.object({
  type: z.literal('electricity'),
  name: z.string().optional(),
  month: z.string(),
  prev_unit: z.number().nonnegative(),
  current_unit: z.number().nonnegative(),
  rate_per_unit: z.number().positive(),
  paid_by: z.string().uuid(),
});

const otherBillSchema = z.object({
  type: z.enum(['rent', 'waste', 'wifi']),
  name: z.string().optional(),
  month: z.string(),
  amount: moneyAmount,
  paid_by: z.string().uuid(),
});

const createBillSchema = z.union([electricitySchema, otherBillSchema]).superRefine((data, ctx) => {
  if (data.type === 'electricity' && data.current_unit < data.prev_unit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Current unit must be ≥ previous unit',
      path: ['current_unit'],
    });
  }
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId') || undefined;
    const isLogs = searchParams.get('logs') === 'true';

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    if (isLogs) {
      const logs = await listBillLogs(roomId, session.user.id);
      return ok(logs);
    }

    const bills = await listBills(roomId, session.user.id, periodId);
    return ok(bills);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/bills error:', error);
    return err(error.message || 'Failed to fetch bills', 400);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const idempotencyKey = request.headers.get('Idempotency-Key') || undefined;

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const body = await request.json();
    const result = createBillSchema.safeParse(body);

    if (!result.success) {
      return err(result.error.issues[0].message, 400);
    }

    const bill = await createBill(roomId, session.user.id, {
      ...result.data,
      idempotency_key: idempotencyKey,
    });

    return ok(bill);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/bills error:', error);
    return err(error.message || 'Failed to create bill', 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('id');

    if (!billId) {
      return err('Bill ID is required', 400);
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await deleteBill(roomId, billId, session.user.id);
    return ok(null);
  } catch (error: any) {
    console.error('[API] DELETE /api/rooms/:roomId/bills error:', error);
    return err(error.message || 'Failed to delete bill', 400);
  }
}
