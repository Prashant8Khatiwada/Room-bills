import { createClient } from '@/lib/supabase/server';
import { listProducts, createProduct, updateProduct, approveProduct, deleteProduct } from '@/lib/services/products';
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

    const products = await listProducts(roomId, session.user.id);
    return ok(products);
  } catch (error: any) {
    console.error('[API] GET /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to fetch products', 400);
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

    if (!body.name || body.defaultPrice === undefined) {
      return err('Name and default price are required', 400);
    }

    const newProduct = await createProduct(roomId, session.user.id, {
      name: body.name,
      defaultPrice: Number(body.defaultPrice),
      unitLabel: body.unitLabel,
    });

    return ok(newProduct);
  } catch (error: any) {
    console.error('[API] POST /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to create product', 400);
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

    if (!body.productId) {
      return err('Product ID is required', 400);
    }

    const updated = await updateProduct(roomId, body.productId, session.user.id, {
      name: body.name,
      defaultPrice: body.defaultPrice ? Number(body.defaultPrice) : undefined,
      unitLabel: body.unitLabel,
    });

    return ok(updated);
  } catch (error: any) {
    console.error('[API] PUT /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to update product', 400);
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

    if (!body.productId) {
      return err('Product ID is required', 400);
    }

    const approved = await approveProduct(roomId, body.productId, session.user.id);
    return ok(approved);
  } catch (error: any) {
    console.error('[API] PATCH /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to approve product', 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return err('Product ID is required', 400);
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return err('Unauthorized', 401);
    }

    await deleteProduct(roomId, productId, session.user.id);
    return ok(null);
  } catch (error: any) {
    console.error('[API] DELETE /api/rooms/:roomId/products error:', error);
    return err(error.message || 'Failed to delete product', 400);
  }
}
