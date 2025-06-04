import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `PLASMO_PUBLIC_`.
   */
  client: {
    PLASMO_PUBLIC_API_URL: z.string(),
    PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    PLASMO_PUBLIC_POSTHOG_HOST: z.string(),
    PLASMO_PUBLIC_POSTHOG_KEY: z.string(),
    PLASMO_PUBLIC_SENTRY_DSN: z.string(),
    PLASMO_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    PLASMO_PUBLIC_SUPABASE_URL: z.string(),
  },
  clientPrefix: 'PLASMO_PUBLIC_',
  extends: [],

  runtimeEnvStrict: {
    NODE_ENV: process.env.NODE_ENV,
    PLASMO_PUBLIC_API_URL: process.env.PLASMO_PUBLIC_API_URL,
    PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    PLASMO_PUBLIC_POSTHOG_HOST: process.env.PLASMO_PUBLIC_POSTHOG_HOST,
    PLASMO_PUBLIC_POSTHOG_KEY: process.env.PLASMO_PUBLIC_POSTHOG_KEY,
    PLASMO_PUBLIC_SENTRY_DSN: process.env.PLASMO_PUBLIC_SENTRY_DSN,
    PLASMO_PUBLIC_SUPABASE_ANON_KEY:
      process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY,
    PLASMO_PUBLIC_SUPABASE_URL: process.env.PLASMO_PUBLIC_SUPABASE_URL,
  },

  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {},

  shared: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === 'lint',
});
