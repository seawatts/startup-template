import { eq } from '@seawatts/db';
import { CreateUserSchema, Users } from '@seawatts/db/schema';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod';

import { protectedProcedure } from '../trpc';

export const userRouter = {
  all: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.Users.findMany({
      limit: 10,
    });
  }),
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.query.Users.findFirst({
        where: eq(Users.id, input.id),
      });
    }),
  create: protectedProcedure
    .input(CreateUserSchema)
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .insert(Users)
        .values({ ...input, id: crypto.randomUUID() })
        .returning();
      return user;
    }),
  current: protectedProcedure.query(({ ctx }) => {
    if (!ctx.auth.userId) throw new Error('User ID is required');
    return ctx.db.query.Users.findFirst({
      where: eq(Users.id, ctx.auth.userId),
    });
  }),
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      // Users can only delete themselves
      // Explicitly check userId exists for defense-in-depth
      if (!ctx.auth.userId || ctx.auth.userId !== input) {
        throw new Error('You can only delete your own account');
      }
      const result = await ctx.db
        .delete(Users)
        .where(eq(Users.id, input))
        .returning();
      return result[0];
    }),
} satisfies TRPCRouterRecord;
