import { ORPCError } from '@orpc/server';
import { ShortUrls } from '@seawatts/db/schema/short-urls';
import { inTenant } from '@seawatts/db/transaction';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Context } from '../context';
import { protectedProcedure } from '../orpc';

// The example area: short links an organization shares (`/s/<code>`).
// Copy this file's shape for a new area. One procedure each for list,
// create, change and delete; every one in the operation catalog
// (operations.ts) so the app, REST, OpenAPI, the SDK, the CLI and MCP all
// get it; every save in product-events.ts. Tenant rows are read and written
// inside `inTenant`, and every query also filters by the organization.

const codePattern = /^[a-z0-9-]{3,64}$/;

function organizationOf(ctx: Context) {
  if (!ctx.auth.orgId || !ctx.auth.userId)
    throw new ORPCError('BAD_REQUEST', {
      message: 'Choose an organization first.',
    });
  return { organizationId: ctx.auth.orgId, userId: ctx.auth.userId };
}

// What a caller sees of a link: no user ids, no internal columns.
const fields = {
  code: ShortUrls.code,
  createdAt: ShortUrls.createdAt,
  id: ShortUrls.id,
  isActive: ShortUrls.isActive,
  redirectUrl: ShortUrls.redirectUrl,
};

const randomCode = () => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(7)), (byte) =>
    alphabet.charAt(byte % alphabet.length),
  ).join('');
};

const isTaken = (error: unknown) => {
  const code = (value: unknown) =>
    value && typeof value === 'object' && 'code' in value
      ? (value as { code: unknown }).code
      : undefined;
  return (
    code(error) === '23505' ||
    code((error as { cause?: unknown } | null)?.cause) === '23505'
  );
};

async function linkOf(organizationId: string, id: string) {
  const [link] = await inTenant(organizationId, (tx) =>
    tx
      .select(fields)
      .from(ShortUrls)
      .where(
        and(eq(ShortUrls.id, id), eq(ShortUrls.organizationId, organizationId)),
      )
      .limit(1),
  );
  if (!link) throw new ORPCError('NOT_FOUND', { message: 'Link not found.' });
  return link;
}

export const linksRouter = {
  create: protectedProcedure
    .input(
      z.object({
        code: z
          .string()
          .regex(
            codePattern,
            'A code is 3 to 64 lowercase letters, numbers or hyphens.',
          )
          .optional()
          .describe('The part after /s/. Left out, a random one is made.'),
        redirectUrl: z
          .string()
          .url('Enter a full address, starting with https://.')
          .max(2048)
          .describe('Where the link sends people.'),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const { organizationId, userId } = organizationOf(ctx);
      // A chosen code that is taken fails; a random one tries again.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const [link] = await inTenant(organizationId, (tx) =>
            tx
              .insert(ShortUrls)
              .values({
                code: input.code ?? randomCode(),
                organizationId,
                redirectUrl: input.redirectUrl,
                userId,
              })
              .returning(fields),
          );
          if (link) return link;
        } catch (error) {
          if (!isTaken(error)) throw error;
          if (input.code)
            throw new ORPCError('CONFLICT', {
              message: `The code '${input.code}' is taken. Choose another.`,
            });
        }
      }
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'The link could not be made. Try again.',
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      const { organizationId } = organizationOf(ctx);
      const [deleted] = await inTenant(organizationId, (tx) =>
        tx
          .delete(ShortUrls)
          .where(
            and(
              eq(ShortUrls.id, input.id),
              eq(ShortUrls.organizationId, organizationId),
            ),
          )
          .returning({ id: ShortUrls.id }),
      );
      if (!deleted)
        throw new ORPCError('NOT_FOUND', { message: 'Link not found.' });
      return deleted;
    }),

  get: protectedProcedure
    .route({ method: 'GET' })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ context: ctx, input }) =>
      linkOf(organizationOf(ctx).organizationId, input.id),
    ),

  list: protectedProcedure
    .route({ method: 'GET' })
    .input(
      z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(50)
          .describe('How many, newest first (50 unless given, 100 at most).'),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const { organizationId } = organizationOf(ctx);
      return inTenant(organizationId, (tx) =>
        tx
          .select(fields)
          .from(ShortUrls)
          .where(eq(ShortUrls.organizationId, organizationId))
          .orderBy(desc(ShortUrls.createdAt))
          .limit(input.limit),
      );
    }),

  setActive: protectedProcedure
    .input(z.object({ active: z.boolean(), id: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      const { organizationId } = organizationOf(ctx);
      const [link] = await inTenant(organizationId, (tx) =>
        tx
          .update(ShortUrls)
          .set({ isActive: input.active })
          .where(
            and(
              eq(ShortUrls.id, input.id),
              eq(ShortUrls.organizationId, organizationId),
            ),
          )
          .returning(fields),
      );
      if (!link)
        throw new ORPCError('NOT_FOUND', { message: 'Link not found.' });
      return link;
    }),
};
