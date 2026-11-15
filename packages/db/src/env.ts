import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    NEXT_PUBLIC_SUPABASE_URL: z.string(),
  },
  extends: [vercel()],

  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    POSTGRES_AUTH_URL: process.env.POSTGRES_AUTH_URL,
    POSTGRES_MIGRATOR_URL: process.env.POSTGRES_MIGRATOR_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_WORKER_URL: process.env.POSTGRES_WORKER_URL,
  },

  // One login role per job (docs/agents/database-roles.md). POSTGRES_URL is
  // the web role. A role's URL that is not set falls back to POSTGRES_URL,
  // which is only right before the one-time bootstrap has made the roles.
  server: {
    POSTGRES_AUTH_URL: z.string().url().optional(),
    POSTGRES_MIGRATOR_URL: z.string().url().optional(),
    POSTGRES_URL: z.string().url(),
    POSTGRES_WORKER_URL: z.string().url().optional(),
  },

  skipValidation:
    !!process.env.CI ||
    process.env.npm_lifecycle_event === 'lint' ||
    process.env.npm_lifecycle_event === 'knip',
});
