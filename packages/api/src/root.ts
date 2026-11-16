import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server';
import { apiKeyUsageRouter } from './router/api-key-usage';
import { apiKeysRouter } from './router/api-keys';
import { authRouter } from './router/auth';
import { billingRouter } from './router/billing';
import { linksRouter } from './router/links';
import { operatorRouter } from './router/operator';
import { orgRouter } from './router/org';
import { orgMembersRouter } from './router/org-members';
import { userRouter } from './router/user';

// Every area, loaded eagerly: the types every client is built from, and the
// router server components call directly. The /api/rpc route serves the
// same areas from rpc-router.ts, which loads each one on first use.
export const appRouter = {
  apiKeys: apiKeysRouter,
  apiKeyUsage: apiKeyUsageRouter,
  auth: authRouter,
  billing: billingRouter,
  links: linksRouter,
  operator: operatorRouter,
  org: orgRouter,
  orgMembers: orgMembersRouter,
  user: userRouter,
};

export type AppRouter = typeof appRouter;
export type RouterInputs = InferRouterInputs<AppRouter>;
export type RouterOutputs = InferRouterOutputs<AppRouter>;
