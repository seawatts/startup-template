import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  clientPrefix: '',
  client: {
    PLASMO_PUBLIC_NODE_ENV: z.string(),
    PLASMO_PUBLIC_API_URL: z.string(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.CI,
});
