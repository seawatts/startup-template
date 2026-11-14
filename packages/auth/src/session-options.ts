import { db } from '@seawatts/db/client';
import { Accounts, Verifications } from '@seawatts/db/schema/accounts';
import {
  Invitations,
  OrgMembers,
  Orgs,
} from '@seawatts/db/schema/organizations';
import { Sessions } from '@seawatts/db/schema/sessions';
import { Users } from '@seawatts/db/schema/users';
import { createId } from '@seawatts/id';
import type { BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from './env';

// Everything that decides how a session is stored, signed and read. The
// full instance (server.ts) and the session-only reader (session-reader.ts)
// both build from this, so a session one of them writes the other reads.
// A setting that changes the cookie, the session row or a session/user
// field belongs here, never in only one of the two.

// Priority: BETTER_AUTH_URL > Vercel env vars > localhost
export const baseUrl =
  env.BETTER_AUTH_URL ??
  (env.VERCEL_ENV === 'production'
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : env.VERCEL_ENV === 'preview'
      ? `https://${env.VERCEL_URL}`
      : 'http://localhost:3000');

const idPrefixes: Record<string, string> = {
  account: 'acc',
  invitation: 'inv',
  member: 'member',
  organization: 'org',
  session: 'session',
  user: 'user',
  verification: 'ver',
};

export const sessionOptions = {
  advanced: {
    database: {
      generateId: ({ model }) =>
        createId({ prefix: idPrefixes[model] ?? model.slice(0, 3) }),
    },
  },
  baseURL: baseUrl,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      account: Accounts,
      invitation: Invitations,
      member: OrgMembers,
      organization: Orgs,
      session: Sessions,
      user: Users,
      verification: Verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
} satisfies BetterAuthOptions;
