import { ORPCError } from '@orpc/server';
import { Users } from '@seawatts/db/schema/users';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { protectedProcedure } from '../orpc';

export const userRouter = {
  current: protectedProcedure
    .route({ method: 'GET' })
    .handler(({ context: ctx }) => {
      if (!ctx.auth.userId)
        throw new ORPCError('BAD_REQUEST', { message: 'User ID is required' });
      return ctx.authDb
        .select()
        .from(Users)
        .where(eq(Users.id, ctx.auth.userId))
        .limit(1)
        .then((rows) => rows[0]);
    }),
  delete: protectedProcedure
    .input(z.string())
    .handler(async ({ input, context: ctx }) => {
      // Users can only delete themselves
      // Explicitly check userId exists for defense-in-depth
      if (!ctx.auth.userId || ctx.auth.userId !== input) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'You can only delete your own account',
        });
      }
      const result = await ctx.authDb
        .delete(Users)
        .where(eq(Users.id, input))
        .returning();
      return result[0];
    }),
};
