import { ORPCError } from '@orpc/server';
import {
  ApiKeyUsage,
  CreateApiKeyUsageSchema,
} from '@seawatts/db/schema/api-keys';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure } from '../orpc';

export const apiKeyUsageRouter = {
  all: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const apiKeyUsage = await ctx.db
        .select()
        .from(ApiKeyUsage)
        .where(eq(ApiKeyUsage.organizationId, ctx.auth.orgId))
        .orderBy(desc(ApiKeyUsage.createdAt));

      return apiKeyUsage;
    }),

  byApiKeyId: protectedProcedure
    .input(z.object({ apiKeyId: z.string() }))
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const usage = await ctx.db
        .select()
        .from(ApiKeyUsage)
        .where(
          and(
            eq(ApiKeyUsage.apiKeyId, input.apiKeyId),
            eq(ApiKeyUsage.organizationId, ctx.auth.orgId),
          ),
        )
        .orderBy(desc(ApiKeyUsage.createdAt));

      return usage;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const usage = await ctx.db
        .select()
        .from(ApiKeyUsage)
        .where(
          and(
            eq(ApiKeyUsage.id, input.id),
            eq(ApiKeyUsage.organizationId, ctx.auth.orgId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!usage) return null;

      return usage;
    }),

  byType: protectedProcedure
    .input(
      z.object({
        type: z.enum(['mcp-server']),
      }),
    )
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const usage = await ctx.db
        .select()
        .from(ApiKeyUsage)
        .where(
          and(
            eq(ApiKeyUsage.type, input.type),
            eq(ApiKeyUsage.organizationId, ctx.auth.orgId),
          ),
        )
        .orderBy(desc(ApiKeyUsage.createdAt));

      return usage;
    }),

  create: protectedProcedure
    .input(CreateApiKeyUsageSchema)
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      if (!ctx.auth.userId)
        throw new ORPCError('BAD_REQUEST', { message: 'User ID is required' });

      try {
        const [usage] = await ctx.db
          .insert(ApiKeyUsage)
          .values({
            ...input,
            organizationId: ctx.auth.orgId,
            userId: ctx.auth.userId,
          })
          .returning();

        return usage;
      } catch (error) {
        console.error(error);
        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create API key usage record',
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const [usage] = await ctx.db
        .delete(ApiKeyUsage)
        .where(
          and(
            eq(ApiKeyUsage.id, input.id),
            eq(ApiKeyUsage.organizationId, ctx.auth.orgId),
          ),
        )
        .returning();

      return usage;
    }),

  // Get recent usage
  recent: protectedProcedure
    .input(
      z.object({
        apiKeyId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        type: z.enum(['mcp-server']).optional(),
      }),
    )
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const { limit, apiKeyId, type } = input;

      const conditions = [eq(ApiKeyUsage.organizationId, ctx.auth.orgId)];

      if (apiKeyId) {
        conditions.push(eq(ApiKeyUsage.apiKeyId, apiKeyId));
      }

      if (type) {
        conditions.push(eq(ApiKeyUsage.type, type));
      }

      const recent = await ctx.db
        .select()
        .from(ApiKeyUsage)
        .where(and(...conditions))
        .orderBy(desc(ApiKeyUsage.createdAt))
        .limit(limit);

      return recent;
    }),

  // Get usage statistics
  stats: protectedProcedure
    .input(
      z.object({
        apiKeyId: z.string().optional(),
        days: z.number().min(1).max(365).default(30),
        type: z.enum(['mcp-server']).optional(),
      }),
    )
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const { apiKeyId, type, days } = input;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const conditions = [
        eq(ApiKeyUsage.organizationId, ctx.auth.orgId),
        gte(ApiKeyUsage.createdAt, startDate),
      ];

      if (apiKeyId) {
        conditions.push(eq(ApiKeyUsage.apiKeyId, apiKeyId));
      }

      if (type) {
        conditions.push(eq(ApiKeyUsage.type, type));
      }

      const stats = await ctx.db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
          type: ApiKeyUsage.type,
        })
        .from(ApiKeyUsage)
        .where(and(...conditions))
        .groupBy(ApiKeyUsage.type);

      return stats;
    }),
};
