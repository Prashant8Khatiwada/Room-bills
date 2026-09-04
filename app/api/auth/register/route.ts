import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ok, err } from '@/lib/apiHelpers';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return err(result.error.issues[0].message, 400);
    }

    const { name, email, password } = result.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return err('Could not complete registration. Please try again.', 400);
    }

    return ok({
      message: 'Account registered successfully. Please verify your email if required.',
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    });
  } catch (error) {
    console.error('[API] /api/auth/register error:', error);
    return err('An unexpected error occurred during registration.', 500);
  }
}
