import { createClient } from '@/lib/supabase/server';
import { listProducts, deleteProduct } from '@/lib/services/products';
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
