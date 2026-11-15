import { ORPCError } from '@orpc/server';
import {
  ApiKeys,
  ApiKeyUsage,
  CreateApiKeySchema,
} from '@seawatts/db/schema/api-keys';
import { inTenant } from '@seawatts/db/transaction';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { publishEvent } from '../events/publish';
import { protectedProcedure } from '../orpc';

export const apiKeysRouter = {
  all: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      const orgId = ctx.auth.orgId;

      const apiKeys = await inTenant(orgId, (tx) =>
        tx
          .select()
          .from(ApiKeys)
          .where(eq(ApiKeys.organizationId, orgId))
          .orderBy(desc(ApiKeys.updatedAt)),
      );

      return apiKeys;
    }),

  allWithLastUsage: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      const orgId = ctx.auth.orgId;

      // Get all API keys
      const apiKeys = await inTenant(orgId, (tx) =>
        tx
          .select()
          .from(ApiKeys)
          .where(eq(ApiKeys.organizationId, orgId))
          .orderBy(desc(ApiKeys.updatedAt)),
      );

      // For each API key, get the most recent usage
      const apiKeysWithLastUsage = await Promise.all(
        apiKeys.map(async (apiKey) => {
          const lastUsage = await inTenant(orgId, (tx) =>
            tx
              .select()
              .from(ApiKeyUsage)
              .where(eq(ApiKeyUsage.apiKeyId, apiKey.id))
              .orderBy(desc(ApiKeyUsage.createdAt))
              .limit(1)
              .then((rows) => rows[0]),
          );

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
      const orgId = ctx.auth.orgId;

      const apiKey = await inTenant(orgId, (tx) =>
        tx
          .select()
          .from(ApiKeys)
          .where(
            and(eq(ApiKeys.id, input.id), eq(ApiKeys.organizationId, orgId)),
          )
          .limit(1)
          .then((rows) => rows[0]),
      );

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
      const orgId = ctx.auth.orgId;
      if (!ctx.auth.userId)
        throw new ORPCError('BAD_REQUEST', { message: 'User ID is required' });

      let apiKey: typeof ApiKeys.$inferSelect | undefined;
      try {
        [apiKey] = await inTenant(orgId, (tx) =>
          tx
            .insert(ApiKeys)
            .values({
              ...input,
              organizationId: orgId,
              userId: ctx.auth.userId,
            })
            .returning(),
        );
      } catch (error) {
        console.error(error);
        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create API key',
        });
      }
      // The insert has committed. A key with an expiry gets a workflow that
      // sleeps until then and switches it off (docs/agents/events.md).
      if (apiKey?.expiresAt)
        await publishEvent('apiKey.expirySet', {
          apiKeyId: apiKey.id,
          expiresAt: apiKey.expiresAt.toISOString(),
          organizationId: apiKey.organizationId,
        });
      return apiKey;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      const orgId = ctx.auth.orgId;

      const apiKey = await inTenant(orgId, (tx) =>
        tx
          .delete(ApiKeys)
          .where(
            and(eq(ApiKeys.id, input.id), eq(ApiKeys.organizationId, orgId)),
          )
          .returning(),
      );

      return apiKey;
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      const orgId = ctx.auth.orgId;

      // First get the current state
      const currentApiKey = await inTenant(orgId, (tx) =>
        tx
          .select()
          .from(ApiKeys)
          .where(
            and(eq(ApiKeys.id, input.id), eq(ApiKeys.organizationId, orgId)),
          )
          .limit(1)
          .then((rows) => rows[0]),
      );

      if (!currentApiKey)
        throw new ORPCError('BAD_REQUEST', { message: 'API Key not found' });

      const [apiKey] = await inTenant(orgId, (tx) =>
        tx
          .update(ApiKeys)
          .set({
            isActive: !currentApiKey.isActive,
          })
          .where(
            and(eq(ApiKeys.id, input.id), eq(ApiKeys.organizationId, orgId)),
          )
          .returning(),
      );

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
      const orgId = ctx.auth.orgId;

      const { id, ...updateData } = input;

      const [apiKey] = await inTenant(orgId, (tx) =>
        tx
          .update(ApiKeys)
          .set(updateData)
          .where(and(eq(ApiKeys.id, id), eq(ApiKeys.organizationId, orgId)))
          .returning(),
      );

      if (apiKey && input.expiresAt !== undefined)
        await publishEvent('apiKey.expirySet', {
          apiKeyId: apiKey.id,
          expiresAt: apiKey.expiresAt?.toISOString() ?? null,
          organizationId: apiKey.organizationId,
        });
      return apiKey;
    }),

  updateLastUsed: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });
      const orgId = ctx.auth.orgId;

      const [apiKey] = await inTenant(orgId, (tx) =>
        tx
          .update(ApiKeys)
          .set({
            lastUsedAt: new Date(),
          })
          .where(
            and(eq(ApiKeys.id, input.id), eq(ApiKeys.organizationId, orgId)),
          )
          .returning(),
      );

      return apiKey;
    }),
};
