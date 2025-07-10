import { useSession } from '@clerk/nextjs';
import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useMemo } from 'react';
import { env } from '../env.client';
import type { Database } from './types';

export const useClient = () => {
  const { session } = useSession();

  const client = useMemo(
    () =>
      createBrowserClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          async accessToken() {
            return session?.getToken() ?? null;
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        },
      ),
    [session],
  );

  useEffect(() => {
    console.log('Connecting to realtime...');
    client.realtime.connect();

    return () => {
      console.log('Disconnecting from realtime...');
      client.realtime.disconnect();
    };
  }, [client]);

  return client;
};

export function createClient(props: { authToken: string; url?: string }) {
  const { authToken, url } = props;
  if (!authToken) {
    console.warn('Warning: No access token provided to createClient');
  }

  const supabaseUrl = url ?? env.NEXT_PUBLIC_SUPABASE_URL;

  console.log('Creating Supabase client with config:', {
    hasToken: !!authToken,
    url: supabaseUrl,
  });

  const client = createBrowserClient<Database>(
    supabaseUrl,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      async accessToken() {
        return authToken;
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    },
  );

  console.log('Connecting to realtime...');
  client.realtime.connect();

  return client;
}
