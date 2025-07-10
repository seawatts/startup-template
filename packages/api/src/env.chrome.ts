import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  client: {
    PLASMO_PUBLIC_API_URL: z.string(),
    PLASMO_PUBLIC_NODE_ENV: z.string(),
  },
  clientPrefix: '',
  runtimeEnv: process.env,
  skipValidation: !!process.env.CI,
});
