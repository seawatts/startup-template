import { ORPCError } from '@orpc/server';
import { ApiKeys } from '@seawatts/db/schema/api-keys';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { inTenant } from '@seawatts/db/transaction';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure } from '../orpc';
import { createOrg } from '../services/create-org';

export const orgRouter = {
  checkNameAvailability: protectedProcedure
    .input(
      z.object({
        excludeOrgId: z.string().optional(),
        name: z.string(),
      }),
    )
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.userId)
        throw new ORPCError('BAD_REQUEST', { message: 'User ID is required' });

      // First check if the user already has access to an organization with this name
      const existingOrgWithAccess = await ctx.authDb
        .select({ id: Orgs.id })
        .from(Orgs)
        .innerJoin(OrgMembers, eq(OrgMembers.organizationId, Orgs.id))
        .where(
          and(
            eq(Orgs.name, input.name),
            eq(OrgMembers.userId, ctx.auth.userId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      // If user has access to an org with this name, it's available to them
      if (existingOrgWithAccess) {
        return {
          available: true,
          message: `You already have access to organization '${input.name}'`,
        };
      }

      const existingOrg = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.name, input.name))
        .limit(1)
        .then((rows) => rows[0]);

      const isAvailable =
        !existingOrg ||
        (input.excludeOrgId && existingOrg.id === input.excludeOrgId);

      return {
        available: Boolean(isAvailable),
        message: isAvailable
          ? `Organization name '${input.name}' is available`
          : `Organization name '${input.name}' already exists`,
      };
    }),
  current: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      return ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);
    }),

  updateName: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(3)
          .max(50)
          .regex(
            /^[a-z0-9-]+$/,
            'Name can only contain lowercase letters, numbers, and hyphens',
          ),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      // Check if organization name already exists
      const existingOrg = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.name, input.name))
        .limit(1)
        .then((rows) => rows[0]);

      if (existingOrg && existingOrg.id !== ctx.auth.orgId) {
        throw new ORPCError('BAD_REQUEST', {
          message: `Organization name '${input.name}' already exists`,
        });
      }

      const [updatedOrg] = await ctx.authDb
        .update(Orgs)
        .set({
          name: input.name,
          updatedAt: new Date(),
        })
        .where(eq(Orgs.id, ctx.auth.orgId))
        .returning();

      return updatedOrg;
    }),

  // Create a new organization with Stripe integration
  upsert: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(3, 'Organization name must be at least 3 characters'),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.userId) {
        throw new ORPCError('BAD_REQUEST', { message: 'User ID is required' });
      }

      const [existingOrg] = await ctx.authDb
        .select({
          id: Orgs.id,
          member: OrgMembers.userId,
          name: Orgs.name,
          stripeCustomerId: Orgs.stripeCustomerId,
        })
        .from(Orgs)
        .leftJoin(
          OrgMembers,
          and(
            eq(OrgMembers.organizationId, Orgs.id),
            eq(OrgMembers.userId, ctx.auth.userId),
          ),
        )
        .where(eq(Orgs.name, input.name))
        .limit(1);

      if (existingOrg) {
        // Only a member gets the organization and its key back. Anyone else
        // learns the name is taken and nothing more.
        if (!existingOrg.member)
          throw new ORPCError('BAD_REQUEST', {
            message: `Organization name '${input.name}' already exists`,
          });
        const apiKey = await inTenant(existingOrg.id, (tx) =>
          tx
            .select()
            .from(ApiKeys)
            .where(eq(ApiKeys.organizationId, existingOrg.id))
            .limit(1)
            .then((rows) => rows[0]),
        );
        return {
          apiKey: {
            id: apiKey?.id,
            key: apiKey?.key,
            name: apiKey?.name,
          },
          org: {
            id: existingOrg.id,
            name: existingOrg.name,
            stripeCustomerId: existingOrg.stripeCustomerId,
          },
        };
      }

      try {
        const result = await createOrg({
          name: input.name,
          userId: ctx.auth.userId,
        });

        return result;
      } catch (error) {
        console.error('Failed to create organization:', error);
        throw new ORPCError('BAD_REQUEST', {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create organization',
        });
      }
    }),
};
