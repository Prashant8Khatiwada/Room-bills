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
    console.error('[API] GET /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to fetch catalog templates', 400);
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

    if (!body.name) {
      return err('Name is required', 400);
    }

    const newTemplate = await createBillTemplate(roomId, session.user.id, {
      name: body.name,
      category: body.category || 'quantity',
      billCategory: body.billCategory || 'expense',
      defaultAmount: body.defaultAmount !== undefined ? Number(body.defaultAmount) : body.defaultPrice !== undefined ? Number(body.defaultPrice) : 0,
      ratePerUnit: body.ratePerUnit ? Number(body.ratePerUnit) : undefined,
    });

    return ok(newTemplate);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to create catalog template', 400);
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

    const templateId = body.templateId || body.productId;
    if (!templateId) {
      return err('Template ID is required', 400);
    }

    const updated = await updateBillTemplate(roomId, templateId, session.user.id, {
      name: body.name,
      category: body.category,
      defaultAmount: body.defaultAmount !== undefined ? Number(body.defaultAmount) : body.defaultPrice !== undefined ? Number(body.defaultPrice) : undefined,
      ratePerUnit: body.ratePerUnit !== undefined ? Number(body.ratePerUnit) : undefined,
    });

    return ok(updated);
  } catch (error: any) {
    console.error('[API] PUT /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to update catalog template', 400);
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

    const templateId = body.templateId || body.productId;
    if (!templateId) {
      return err('Template ID is required', 400);
    }

    const approved = await approveBillTemplate(roomId, templateId, session.user.id);
    return ok(approved);
  } catch (error: any) {
    console.error('[API] PATCH /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to approve catalog template', 400);
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
    console.error('[API] DELETE /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to delete catalog template', 400);
  }
}
