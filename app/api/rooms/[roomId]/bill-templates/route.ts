import { createClient } from '@/lib/supabase/server';
import { listBillTemplates, createBillTemplate, updateBillTemplate, approveBillTemplate, deleteBillTemplate } from '@/lib/services/billTemplates';
import { ok, err } from '@/lib/apiHelpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    const templates = await listBillTemplates(roomId, session.user.id);
    return ok(templates);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/bill-templates error:', error);
    return err(error.message || 'Failed to fetch bill templates', 400);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    if (!body.name || !body.category) {
      return err('Template name and bill category (fixed or metered) are required', 400);
    }

    const newTemplate = await createBillTemplate(roomId, session.user.id, {
      name: body.name,
      category: body.category === 'metered' ? 'metered' : 'fixed',
      defaultAmount: body.defaultAmount ? Number(body.defaultAmount) : 0,
      ratePerUnit: body.ratePerUnit ? Number(body.ratePerUnit) : undefined,
    });

    return ok(newTemplate);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/bill-templates error:', error);
    return err(error.message || 'Failed to create bill template', 400);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    if (!body.templateId) {
      return err('Template ID is required', 400);
    }

    const updated = await updateBillTemplate(roomId, body.templateId, session.user.id, {
      name: body.name,
      category: body.category,
      defaultAmount: body.defaultAmount !== undefined ? Number(body.defaultAmount) : undefined,
      ratePerUnit: body.ratePerUnit !== undefined ? Number(body.ratePerUnit) : undefined,
    });

    return ok(updated);
  } catch (error: any) {
    console.error('[API] PUT /api/rooms/:roomId/bill-templates error:', error);
    return err(error.message || 'Failed to update bill template', 400);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    if (!body.templateId) {
      return err('Template ID is required', 400);
    }

    const approved = await approveBillTemplate(roomId, body.templateId, session.user.id);
    return ok(approved);
  } catch (error: any) {
    console.error('[API] PATCH /api/rooms/:roomId/bill-templates error:', error);
    return err(error.message || 'Failed to approve bill template', 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return err('Template ID is required', 400);
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await deleteBillTemplate(roomId, templateId, session.user.id);
    return ok(null);
  } catch (error: any) {
    console.error('[API] DELETE /api/rooms/:roomId/bill-templates error:', error);
    return err(error.message || 'Failed to delete bill template', 400);
  }
}
