import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.client';
import type { Database } from './types';

export function createClient(props: { authToken: string; url?: string }) {
  const { authToken, url } = props;
  if (!authToken) {
    console.warn('Warning: No access token provided to createRealtimeClient');
  }

  const supabaseUrl = url ?? env.NEXT_PUBLIC_SUPABASE_URL;

  console.log('Creating Supabase realtime client with config:', {
    hasToken: !!authToken,
    url: supabaseUrl,
  });

  const client = createSupabaseClient<Database>(
    supabaseUrl,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      accessToken: () => {
        return Promise.resolve(authToken);
      },
      // auth: {
      // persistSession: false,
      // autoRefreshToken: false,
      // },
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
