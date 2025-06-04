import { createEnv } from '@t3-oss/env-core';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  extends: [vercel()],
  runtimeEnv: process.env,
  server: {
    POSTGRES_URL: z.string().url(),
    VERCEL: z.boolean().optional(),
  },
  skipValidation: !!process.env.CI,
});
