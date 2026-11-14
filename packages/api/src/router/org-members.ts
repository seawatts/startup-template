import { OrgMembers } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { eq } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const orgMembersRouter = createTRPCRouter({
  all: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.auth.orgId) throw new Error('Organization ID is required');
    // Fetch all org members for the current org, including user info
    const rows = await ctx.db
      .select({ member: OrgMembers, user: Users })
      .from(OrgMembers)
      .innerJoin(Users, eq(Users.id, OrgMembers.userId))
      .where(eq(OrgMembers.organizationId, ctx.auth.orgId));
    return rows.map(({ member, user }) => ({ ...member, user }));
  }),
});
