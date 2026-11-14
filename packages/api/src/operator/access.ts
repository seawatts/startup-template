import { ORPCError } from '@orpc/server';
import { protectedProcedure } from '../orpc';

// The operator console ("Internal" in the app) is for the people who run the
// product: they see across every customer organization without joining any.
// An operator is a signed-in person whose verified email is listed in
// OPERATOR_EMAILS (comma separated). Not a secret, but set it per
// environment. The check runs on every call, on the server; the page and the
// sidebar link only decide what to show. An API key is never an operator.
//
// Before real customers, strengthen this: require a second factor or a
// single sign-on domain, and record each operator read.

export function operatorEmails(value = process.env.OPERATOR_EMAILS) {
  return (value ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

type Person = { email?: string | null; emailVerified?: boolean | null };

export function isOperator(user: Person | null | undefined) {
  if (!user?.email || !user.emailVerified) return false;
  return operatorEmails().includes(user.email.toLowerCase());
}

export const operatorProcedure = protectedProcedure.use(({ context, next }) => {
  // The same answer as a page that does not exist: nothing to probe.
  if (context.apiKey || !isOperator(context.user))
    throw new ORPCError('NOT_FOUND');
  return next();
});
