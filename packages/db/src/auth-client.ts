import { drizzle } from 'drizzle-orm/postgres-js';
import { guardedConnection } from './client';
import { env } from './env';

// The auth role: people, organizations, memberships, sessions and the
// operator list. These tables are not tenant-scoped by row-level security
// (a person's memberships are read before any organization is chosen), so
// every query here names the person or the organization it is for. The auth
// role cannot read a tenant table.
export const authConnection = guardedConnection(
  env.POSTGRES_AUTH_URL || env.POSTGRES_URL,
);
export const authDb = drizzle(authConnection);
