import { ORPCError } from '@orpc/server';
import {
  ApiKeys,
  ApiKeyUsage,
  CreateApiKeySchema,
} from '@seawatts/db/schema/api-keys';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure } from '../orpc';

export const apiKeysRouter = {
  all: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const apiKeys = await ctx.db
        .select()
        .from(ApiKeys)
        .where(eq(ApiKeys.organizationId, ctx.auth.orgId))
        .orderBy(desc(ApiKeys.updatedAt));

      return apiKeys;
    }),

  allWithLastUsage: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      // Get all API keys
      const apiKeys = await ctx.db
        .select()
        .from(ApiKeys)
        .where(eq(ApiKeys.organizationId, ctx.auth.orgId))
        .orderBy(desc(ApiKeys.updatedAt));

      // For each API key, get the most recent usage
      const apiKeysWithLastUsage = await Promise.all(
        apiKeys.map(async (apiKey) => {
          const lastUsage = await ctx.db
            .select()
            .from(ApiKeyUsage)
            .where(eq(ApiKeyUsage.apiKeyId, apiKey.id))
            .orderBy(desc(ApiKeyUsage.createdAt))
            .limit(1)
            .then((rows) => rows[0]);

          return {
            ...apiKey,
            lastUsage,
          };
        }),
      );

      return apiKeysWithLastUsage;
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const apiKey = await ctx.db
        .select()
        .from(ApiKeys)
        .where(
          and(
            eq(ApiKeys.id, input.id),
            eq(ApiKeys.organizationId, ctx.auth.orgId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!apiKey) return null;

      return apiKey;
    }),

  create: protectedProcedure
    .input(CreateApiKeySchema)
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      if (!ctx.auth.userId)
        throw new ORPCError('BAD_REQUEST', { message: 'User ID is required' });

      try {
        const [apiKey] = await ctx.db
          .insert(ApiKeys)
          .values({
            ...input,
            organizationId: ctx.auth.orgId,
            userId: ctx.auth.userId,
          })
          .returning();

        return apiKey;
      } catch (error) {
        console.error(error);
        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create API key',
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

      const apiKey = await ctx.db
        .delete(ApiKeys)
        .where(
          and(
            eq(ApiKeys.id, input.id),
            eq(ApiKeys.organizationId, ctx.auth.orgId),
          ),
        )
        .returning();

      return apiKey;
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      // First get the current state
      const currentApiKey = await ctx.db
        .select()
        .from(ApiKeys)
        .where(
          and(
            eq(ApiKeys.id, input.id),
            eq(ApiKeys.organizationId, ctx.auth.orgId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!currentApiKey)
        throw new ORPCError('BAD_REQUEST', { message: 'API Key not found' });

      const [apiKey] = await ctx.db
        .update(ApiKeys)
        .set({
          isActive: !currentApiKey.isActive,
        })
        .where(
          and(
            eq(ApiKeys.id, input.id),
            eq(ApiKeys.organizationId, ctx.auth.orgId),
          ),
        )
        .returning();

      return apiKey;
    }),

  update: protectedProcedure
    .input(
      z.object({
        expiresAt: z.date().nullable().optional(),
        id: z.string(),
        isActive: z.boolean().optional(),
        name: z.string().optional(),
        permissions: z
          .object({
            admin: z.boolean().optional(),
            delete: z.boolean().optional(),
            read: z.boolean().optional(),
            webhookIds: z.array(z.string()).optional(),
            write: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const { id, ...updateData } = input;

      const [apiKey] = await ctx.db
        .update(ApiKeys)
        .set(updateData)
        .where(
          and(eq(ApiKeys.id, id), eq(ApiKeys.organizationId, ctx.auth.orgId)),
        )
        .returning();

      return apiKey;
    }),

  updateLastUsed: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const [apiKey] = await ctx.db
        .update(ApiKeys)
        .set({
          lastUsedAt: new Date(),
        })
        .where(
          and(
            eq(ApiKeys.id, input.id),
            eq(ApiKeys.organizationId, ctx.auth.orgId),
          ),
        )
        .returning();

      return apiKey;
    }),
};
