import { ORPCError } from '@orpc/server';
import { OrgMembers } from '@seawatts/db/schema/organizations';
import { and, eq } from 'drizzle-orm';
import type { Context } from '../context';

// The caller's membership, checked on the server for every write that needs
// a role. An API key acts as the person who made it, so the same check
// applies to every interface.
export async function membership(ctx: Context, organizationId: string) {
  if (!ctx.auth.userId)
    throw new ORPCError('UNAUTHORIZED', { message: 'Sign in first.' });
  const [member] = await ctx.authDb
    .select()
    .from(OrgMembers)
    .where(
      and(
        eq(OrgMembers.organizationId, organizationId),
        eq(OrgMembers.userId, ctx.auth.userId),
      ),
    )
    .limit(1);
  if (!member)
    throw new ORPCError('NOT_FOUND', {
      message: 'You are not a member of this organization.',
    });
  return member;
}

export async function activeAdmin(ctx: Context, doing: string) {
  if (!ctx.auth.orgId)
    throw new ORPCError('BAD_REQUEST', { message: 'Choose an organization.' });
  const member = await membership(ctx, ctx.auth.orgId);
  if (member.role !== 'admin' && member.role !== 'owner')
    throw new ORPCError('FORBIDDEN', { message: `Only admins can ${doing}.` });
  return { member, organizationId: ctx.auth.orgId };
}
