import { ORPCError } from '@orpc/server';
import { OrgMembers } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Context } from '../context';
import { protectedProcedure } from '../orpc';
import { activeAdmin, membership } from '../services/org-role';

// Membership changes go through Better Auth's organization API, which owns
// invitations and its own hooks. It reads the session cookie itself, so
// these writes are session-only (operations.ts) and load the full auth
// instance only when one runs.
export const betterAuth = () =>
  import('@seawatts/auth/server').then((module) => module.auth.api);

async function memberOf(ctx: Context, organizationId: string, id: string) {
  const [member] = await ctx.authDb
    .select()
    .from(OrgMembers)
    .where(
      and(eq(OrgMembers.id, id), eq(OrgMembers.organizationId, organizationId)),
    )
    .limit(1);
  if (!member)
    throw new ORPCError('NOT_FOUND', { message: 'Member not found.' });
  return member;
}

export const orgMembersRouter = {
  all: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      // Fetch all org members for the current org, including user info
      const rows = await ctx.authDb
        .select({ member: OrgMembers, user: Users })
        .from(OrgMembers)
        .innerJoin(Users, eq(Users.id, OrgMembers.userId))
        .where(eq(OrgMembers.organizationId, ctx.auth.orgId));
      return rows.map(({ member, user }) => ({ ...member, user }));
    }),

  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email('Enter a valid email address.'),
        role: z.enum(['admin', 'member']).default('member'),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const { organizationId } = await activeAdmin(ctx, 'invite members');
      const [{ Orgs }, { customerEntitlements }] = await Promise.all([
        import('@seawatts/db/schema/organizations'),
        import('@seawatts/stripe/guards/entitlements-server'),
      ]);
      const [org] = await ctx.authDb
        .select({ customerId: Orgs.stripeCustomerId })
        .from(Orgs)
        .where(eq(Orgs.id, organizationId))
        .limit(1);
      const entitled = org?.customerId
        ? (await customerEntitlements(org.customerId)).unlimited_developers
        : false;
      if (!entitled)
        throw new ORPCError('FORBIDDEN', {
          message: 'Inviting teammates needs a paid plan.',
        });
      await (await betterAuth()).createInvitation({
        body: { email: input.email, organizationId, role: input.role },
        headers: ctx.headers,
      });
      return { invited: true };
    }),

  leave: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      const member = await membership(ctx, input.organizationId);
      if (member.role === 'owner')
        throw new ORPCError('BAD_REQUEST', {
          message:
            'The owner cannot leave. Transfer ownership or delete the organization.',
        });
      await (await betterAuth()).removeMember({
        body: {
          memberIdOrEmail: member.userId,
          organizationId: input.organizationId,
        },
        headers: ctx.headers,
      });
      return { left: true };
    }),

  remove: protectedProcedure
    .input(z.object({ memberId: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      const { organizationId } = await activeAdmin(ctx, 'remove members');
      const target = await memberOf(ctx, organizationId, input.memberId);
      if (target.role === 'owner')
        throw new ORPCError('BAD_REQUEST', {
          message: 'The owner cannot be removed.',
        });
      await (await betterAuth()).removeMember({
        body: { memberIdOrEmail: target.userId, organizationId },
        headers: ctx.headers,
      });
      return { removed: true };
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        memberId: z.string().min(1),
        role: z.enum(['admin', 'member', 'owner']),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const { member, organizationId } = await activeAdmin(ctx, 'change roles');
      const target = await memberOf(ctx, organizationId, input.memberId);
      if (
        (target.role === 'owner' || input.role === 'owner') &&
        member.role !== 'owner'
      )
        throw new ORPCError('FORBIDDEN', {
          message: 'Only the owner can change who owns the organization.',
        });
      await (await betterAuth()).updateMemberRole({
        body: { memberId: target.id, organizationId, role: input.role },
        headers: ctx.headers,
      });
      return { role: input.role };
    }),
};
