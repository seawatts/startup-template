import { appRouter, createTRPCContext } from '@seawatts/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';

const handler = (request: NextRequest) =>
  fetchRequestHandler({
    createContext: () => createTRPCContext(),
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
  });

export { handler as GET, handler as POST };
