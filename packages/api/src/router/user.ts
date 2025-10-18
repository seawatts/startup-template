import { eq } from '@seawatts/db';
import { CreateUserSchema, Users } from '@seawatts/db/schema';
import type { TRPCRouterRecord } from '@trpc/server';
import { z } from 'zod';

import { protectedProcedure, publicProcedure } from '../trpc';

export const userRouter = {
  all: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.Users.findMany({
      limit: 10,
    });
  }),
  byId: publicProcedure
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
    return ctx.db.query.Users.findFirst({
      where: eq(Users.id, ctx.auth.userId),
    });
  }),
  delete: publicProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    const result = await ctx.db
      .delete(Users)
      .where(eq(Users.id, input))
      .returning();
    return result[0];
  }),
} satisfies TRPCRouterRecord;
