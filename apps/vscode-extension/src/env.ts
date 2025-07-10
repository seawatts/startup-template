import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_API_URL: z.string(),
    NEXT_PUBLIC_VSCODE_EXTENSION_ID: z.string().default('acme.acme-vscode'),
  },
  clientPrefix: '',
  runtimeEnv: process.env,
  skipValidation: !!process.env.CI,
});
