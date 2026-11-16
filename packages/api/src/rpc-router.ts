import { lazy } from '@orpc/server';

// The /api/rpc handler loads an area's procedures the first time one of them
// is called, not every area on every cold start: a cold server answers its
// first read after evaluating one area's code instead of the whole API.
// Same areas and procedures as appRouter (root.ts); tests/rpc-router.test.ts
// keeps the two in step. A new area gets a line in both.
export const rpcRouter = {
  apiKeys: lazy(() =>
    import('./router/api-keys').then((m) => ({ default: m.apiKeysRouter })),
  ),
  apiKeyUsage: lazy(() =>
    import('./router/api-key-usage').then((m) => ({
      default: m.apiKeyUsageRouter,
    })),
  ),
  auth: lazy(() =>
    import('./router/auth').then((m) => ({ default: m.authRouter })),
  ),
  billing: lazy(() =>
    import('./router/billing').then((m) => ({ default: m.billingRouter })),
  ),
  links: lazy(() =>
    import('./router/links').then((m) => ({ default: m.linksRouter })),
  ),
  operator: lazy(() =>
    import('./router/operator').then((m) => ({ default: m.operatorRouter })),
  ),
  org: lazy(() =>
    import('./router/org').then((m) => ({ default: m.orgRouter })),
  ),
  orgMembers: lazy(() =>
    import('./router/org-members').then((m) => ({
      default: m.orgMembersRouter,
    })),
  ),
  user: lazy(() =>
    import('./router/user').then((m) => ({ default: m.userRouter })),
  ),
};
