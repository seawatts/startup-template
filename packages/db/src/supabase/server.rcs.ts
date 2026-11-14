import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { env } from '../env';
import type { Database } from './types.generated';

export interface SessionInfo {
  token?: string | null;
}

export type GetServerSessionFn = () => Promise<SessionInfo | null>;

export function createServerClientFactory(getSession: GetServerSessionFn) {
  return cache(async () => {
    const cookieStore = await cookies();
    const session = await getSession();

    return createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        async accessToken() {
          // Better Auth session token
          return session?.token ?? null;
        },
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet)
                cookieStore.set(name, value, options);
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    );
  });
}

// Keep the old export name for backwards compatibility, but now it's a factory
export const createClient = createServerClientFactory;
