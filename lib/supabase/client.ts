import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/envconfig';

export const createClient = () => {
  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const url = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : 'https://placeholder.supabase.co';
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(url, key);
};

