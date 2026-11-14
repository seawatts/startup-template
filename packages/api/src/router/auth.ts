import { db } from '@seawatts/db/client';
import { Accounts } from '@seawatts/db/schema/accounts';
import { AuthCodes } from '@seawatts/db/schema/api-keys';
import { Orgs } from '@seawatts/db/schema/organizations';
import { Sessions } from '@seawatts/db/schema/sessions';
import { Users } from '@seawatts/db/schema/users';
import { createId } from '@seawatts/id';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { upsertOrg } from '../services';
import { protectedProcedure, publicProcedure } from '../trpc';

export const authRouter = {
  exchangeAuthCode: publicProcedure
    .input(
      z.object({
        code: z.string(),
        sessionTemplate: z.enum(['cli', 'supabase']).default('cli'),
      }),
    )
    .mutation(async ({ input }) => {
      const { code } = input;

      const authCode = await db.transaction(async (tx) => {
        const foundCode = await tx.query.AuthCodes.findFirst({
          where: and(
            eq(AuthCodes.id, code),
            isNull(AuthCodes.usedAt),
            gte(AuthCodes.expiresAt, new Date()),
          ),
        });

        if (!foundCode) {
          return null;
        }

        await tx
          .update(AuthCodes)
          .set({
            usedAt: new Date(),
          })
          .where(eq(AuthCodes.id, code));

        return foundCode;
      });

      if (!authCode) {
        throw new TRPCError({
          cause: new Error(`Auth code validation failed for code: ${code}`),
          code: 'BAD_REQUEST',
          message: 'Invalid or expired authentication code',
        });
      }

      try {
        // Get user from database
        const user = await db.query.Users.findFirst({
          where: eq(Users.id, authCode.userId),
        });

        if (!user) {
          throw new TRPCError({
            cause: new Error(`User not found for userId: ${authCode.userId}`),
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Use the upsertOrg utility function
        await upsertOrg({
          name: `org-${authCode.organizationId}`,
          orgId: authCode.organizationId,
          userId: authCode.userId,
        });

        const response = {
          authToken: authCode.sessionId, // Use session ID as token
          orgId: authCode.organizationId,
          sessionId: authCode.sessionId,
          user: {
            email: user.email,
            fullName: user.name || '',
            id: authCode.userId,
          },
        };
        return response;
      } catch (error) {
        // Handle API errors with detailed metadata
        if (error instanceof Error) {
          // Add context about what operation failed
          const errorContext = {
            authCode: code,
            operation: 'auth_code_exchange',
            orgId: authCode.organizationId,
            originalError: error,
            sessionId: authCode.sessionId,
            sessionTemplate: input.sessionTemplate,
            userId: authCode.userId,
          };

          console.error(
            'An error occurred during auth code exchange:',
            errorContext,
          );

          // Check for specific error patterns
          if (
            error.message.includes('not found') ||
            error.message.includes('404')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'NOT_FOUND',
              message: 'User, session, or organization not found',
            });
          }

          if (
            error.message.includes('unauthorized') ||
            error.message.includes('401')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'UNAUTHORIZED',
              message: 'Unauthorized access',
            });
          }

          if (
            error.message.includes('forbidden') ||
            error.message.includes('403')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'FORBIDDEN',
              message: 'Access forbidden',
            });
          }

          throw new TRPCError({
            cause: error,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to retrieve user or organization data',
          });
        }
        throw new TRPCError({
          cause: new Error(
            `Unknown error during auth code exchange for code: ${code}, userId: ${authCode.userId}, orgId: ${authCode.organizationId}`,
          ),
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'An unexpected error occurred while processing authentication',
        });
      }
    }),

  /**
   * Sync user data from production OAuth to local database.
   * This is used during mobile development when OAuth happens on production
   * but we want the user record in the local database.
   *
   * Only works in development mode for security.
   */
  syncFromProduction: publicProcedure
    .input(
      z.object({
        account: z
          .object({
            accessToken: z.string().optional(),
            accountId: z.string(),
            providerId: z.string(),
            refreshToken: z.string().optional(),
          })
          .optional(),
        user: z.object({
          email: z.string().email(),
          emailVerified: z.boolean().default(false),
          id: z.string(),
          image: z.string().nullable().optional(),
          name: z.string(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This endpoint is only available in development mode',
        });
      }

      const { user, account } = input;

      try {
        // Upsert user
        const [upsertedUser] = await db
          .insert(Users)
          .values({
            email: user.email,
            emailVerified: user.emailVerified,
            id: user.id,
            image: user.image,
            name: user.name,
          })
          .onConflictDoUpdate({
            set: {
              email: user.email,
              emailVerified: user.emailVerified,
              image: user.image,
              name: user.name,
              updatedAt: new Date(),
            },
            target: [Users.id],
          })
          .returning();

        // Upsert account if provided
        // Better Auth uses composite unique key on (accountId, providerId, userId)
        if (account) {
          // First, try to find existing account
          const existingAccount = await db.query.Accounts.findFirst({
            where: and(
              eq(Accounts.accountId, account.accountId),
              eq(Accounts.providerId, account.providerId),
              eq(Accounts.userId, user.id),
            ),
          });

          if (existingAccount) {
            // Update existing account
            await db
              .update(Accounts)
              .set({
                accessToken: account.accessToken,
                refreshToken: account.refreshToken,
                updatedAt: new Date(),
              })
              .where(eq(Accounts.id, existingAccount.id));
          } else {
            // Insert new account
            await db.insert(Accounts).values({
              accessToken: account.accessToken,
              accountId: account.accountId,
              id: createId({ prefix: 'acc' }),
              providerId: account.providerId,
              refreshToken: account.refreshToken,
              userId: user.id,
            });
          }
        }

        // Upsert session - find existing valid session or create new one
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Check for existing valid session for this user
        const existingSession = await db.query.Sessions.findFirst({
          orderBy: [desc(Sessions.createdAt)],
          where: and(
            eq(Sessions.userId, user.id),
            gte(Sessions.expiresAt, new Date()),
          ),
        });

        let sessionId: string;
        let sessionToken: string;

        if (existingSession) {
          // Extend existing session
          sessionId = existingSession.id;
          sessionToken = existingSession.token;
          await db
            .update(Sessions)
            .set({
              expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(Sessions.id, sessionId));
        } else {
          // Create new session
          sessionToken = createId({ prefix: 'session' });
          sessionId = createId({ prefix: 'sess' });
          await db.insert(Sessions).values({
            expiresAt,
            id: sessionId,
            token: sessionToken,
            userId: user.id,
          });
        }

        console.log(
          `[DEV SYNC] Synced user ${user.email} (${user.id}) to local database with session ${sessionId}`,
        );

        return {
          sessionId,
          sessionToken,
          success: true,
          user: upsertedUser,
        };
      } catch (error) {
        console.error('[DEV SYNC] Failed to sync user:', error);
        throw new TRPCError({
          cause: error instanceof Error ? error : undefined,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync user to local database',
        });
      }
    }),
  verifySessionToken: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sessionTemplate: z.enum(['cli', 'supabase']).default('cli'),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        // Get user from context (already authenticated via Better Auth)
        const userId = ctx.auth.userId;
        const orgId = ctx.auth.orgId;

        if (!userId) {
          throw new TRPCError({
            cause: new Error('User not authenticated'),
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          });
        }

        // Get user from database
        const user = await db.query.Users.findFirst({
          where: eq(Users.id, userId),
        });

        if (!user) {
          throw new TRPCError({
            cause: new Error(`User not found for userId: ${userId}`),
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        if (!orgId) {
          throw new TRPCError({
            cause: new Error(
              `No active organization for session: ${input.sessionId}, userId: ${userId}`,
            ),
            code: 'BAD_REQUEST',
            message: 'No active organization found for this session',
          });
        }

        // Get organization from database
        const org = await db.query.Orgs.findFirst({
          where: eq(Orgs.id, orgId),
        });

        // Use the upsertOrg utility function
        await upsertOrg({
          name: org?.name || `org-${orgId}`,
          orgId,
          userId,
        });

        return {
          authToken: input.sessionId,
          orgId,
          orgName: org?.name || '',
          user: {
            email: user.email,
            fullName: user.name || '',
            id: userId,
          },
        };
      } catch (error) {
        // Handle API errors with detailed metadata
        if (error instanceof TRPCError) {
          throw error; // Re-throw TRPC errors as-is
        }
        if (error instanceof Error) {
          // Add context about what operation failed
          const errorContext = {
            operation: 'session_verification',
            originalError: error,
            sessionId: input.sessionId,
            sessionTemplate: input.sessionTemplate,
            userId: ctx.auth.userId,
          };

          console.error(
            'An error occurred during session verification:',
            errorContext,
          );

          // Check for specific error patterns
          if (
            error.message.includes('not found') ||
            error.message.includes('404')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'NOT_FOUND',
              message: 'User, session, or organization not found',
            });
          }

          if (
            error.message.includes('unauthorized') ||
            error.message.includes('401')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'UNAUTHORIZED',
              message: 'Unauthorized access',
            });
          }

          if (
            error.message.includes('forbidden') ||
            error.message.includes('403')
          ) {
            throw new TRPCError({
              cause: error,
              code: 'FORBIDDEN',
              message: 'Access forbidden',
            });
          }

          throw new TRPCError({
            cause: error,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify session or retrieve user data',
          });
        }
        throw new TRPCError({
          cause: new Error(
            `Unknown error during session verification for sessionId: ${input.sessionId}, userId: ${ctx.auth.userId}`,
          ),
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while verifying session',
        });
      }
    }),
};
