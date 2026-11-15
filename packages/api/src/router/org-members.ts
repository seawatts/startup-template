import { ORPCError } from '@orpc/server';
import { OrgMembers } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { eq } from 'drizzle-orm';
import { protectedProcedure } from '../orpc';

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
};
