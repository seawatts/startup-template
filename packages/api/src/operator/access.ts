import { ORPCError } from '@orpc/server';
import { db } from '@seawatts/db/client';
import { requestRead } from '@seawatts/db/request-reads';
import { Operators } from '@seawatts/db/schema/operators';
import { eq } from 'drizzle-orm';
import { protectedProcedure } from '../orpc';

// The operator console ("Internal" in the app) is for the people who run the
// product: they see across every customer organization without joining any.
// An operator is a signed-in person with a verified email and a row in the
// `operators` table. Rows are added with `bun operators add <email>`
// (packages/db/scripts/operators.ts): access is data, not configuration, so
// it is the same in every environment that shares the database, changes
// without a deploy and says who added whom and when. The check runs on every
// call, on the server; the page and the sidebar link only decide what to
// show. An API key is never an operator.
//
// Before real customers, strengthen this: require a second factor or a
// single sign-on domain, and record each operator read.

type Person = { id?: string | null; emailVerified?: boolean | null };

export async function isOperator(user: Person | null | undefined) {
  const id = user?.id;
  if (!id || !user.emailVerified) return false;
  // A screen's reads ask once between them.
  return requestRead(`operator:${id}`, async () => {
    const [row] = await db
      .select({ userId: Operators.userId })
      .from(Operators)
      .where(eq(Operators.userId, id))
      .limit(1);
    return Boolean(row);
  });
}

export const operatorProcedure = protectedProcedure.use(
  async ({ context, next }) => {
    // The same answer as a page that does not exist: nothing to probe.
    if (context.apiKey || !(await isOperator(context.user)))
      throw new ORPCError('NOT_FOUND');
    return next();
  },
);
