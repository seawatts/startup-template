import { createTRPCClient } from '@trpc/client';
import type { AppRouter } from '../root';
import { type ClientConfig, createDefaultLinks } from './config';

export const createClient = (config?: ClientConfig) => {
  return createTRPCClient<AppRouter>({
    links: createDefaultLinks({
      authToken: config?.authToken,
      sessionCookie: config?.sessionCookie,
      sourceHeader: config?.sourceHeader ?? 'cli-client',
    }),
  });
};
