import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/apiHelpers';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const { rateLimit } = await import('@/lib/rateLimit');

    if (!rateLimit(ip, 5, 60_000)) {
      return err('Too many login attempts. Please try again later.', 429);
    }

    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return err('Invalid email or password', 400);
    }

    const { email, password } = result.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Generic error message to prevent account enumeration
      return err('Invalid email or password', 400);
    }

    return ok({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    console.error('[API] /api/auth/login error:', error);
    return err('An unexpected error occurred during login.', 500);
  }
}
