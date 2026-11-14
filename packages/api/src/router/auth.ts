import { ORPCError } from '@orpc/server';
import { db } from '@seawatts/db/client';
import { Accounts } from '@seawatts/db/schema/accounts';
import { AuthCodes } from '@seawatts/db/schema/api-keys';
import { Orgs } from '@seawatts/db/schema/organizations';
import { Sessions } from '@seawatts/db/schema/sessions';
import { Users } from '@seawatts/db/schema/users';
import { createId } from '@seawatts/id';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../orpc';
import { upsertOrg } from '../services/upsert-org';

export const authRouter = {
  exchangeAuthCode: publicProcedure
    .input(
      z.object({
        code: z.string(),
        sessionTemplate: z.enum(['cli', 'supabase']).default('cli'),
      }),
    )
    .handler(async ({ input }) => {
      const { code } = input;

      const authCode = await db.transaction(async (tx) => {
        const foundCode = await tx
          .select()
          .from(AuthCodes)
          .where(
            and(
              eq(AuthCodes.id, code),
              isNull(AuthCodes.usedAt),
              gte(AuthCodes.expiresAt, new Date()),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);

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
        throw new ORPCError('BAD_REQUEST', {
          cause: new Error(`Auth code validation failed for code: ${code}`),
          message: 'Invalid or expired authentication code',
        });
      }

      try {
        // Get user from database
        const user = await db
          .select()
          .from(Users)
          .where(eq(Users.id, authCode.userId))
          .limit(1)
          .then((rows) => rows[0]);

        if (!user) {
          throw new ORPCError('NOT_FOUND', {
            cause: new Error(`User not found for userId: ${authCode.userId}`),
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
            throw new ORPCError('NOT_FOUND', {
              cause: error,
              message: 'User, session, or organization not found',
            });
          }

          if (
            error.message.includes('unauthorized') ||
            error.message.includes('401')
          ) {
            throw new ORPCError('UNAUTHORIZED', {
              cause: error,
              message: 'Unauthorized access',
            });
          }

          if (
            error.message.includes('forbidden') ||
            error.message.includes('403')
          ) {
            throw new ORPCError('FORBIDDEN', {
              cause: error,
              message: 'Access forbidden',
            });
          }

          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            cause: error,
            message: 'Failed to retrieve user or organization data',
          });
        }
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          cause: new Error(
            `Unknown error during auth code exchange for code: ${code}, userId: ${authCode.userId}, orgId: ${authCode.organizationId}`,
          ),
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
    .handler(async ({ input }) => {
      // Only allow in development
      if (process.env.NODE_ENV !== 'development') {
        throw new ORPCError('FORBIDDEN', {
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
          const existingAccount = await db
            .select()
            .from(Accounts)
            .where(
              and(
                eq(Accounts.accountId, account.accountId),
                eq(Accounts.providerId, account.providerId),
                eq(Accounts.userId, user.id),
              ),
            )
            .limit(1)
            .then((rows) => rows[0]);

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
        const existingSession = await db
          .select()
          .from(Sessions)
          .where(
            and(
              eq(Sessions.userId, user.id),
              gte(Sessions.expiresAt, new Date()),
            ),
          )
          .orderBy(desc(Sessions.createdAt))
          .limit(1)
          .then((rows) => rows[0]);

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
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          cause: error instanceof Error ? error : undefined,
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
    .route({ method: 'GET' })
    .handler(async ({ input, context: ctx }) => {
      try {
        // Get user from context (already authenticated via Better Auth)
        const userId = ctx.auth.userId;
        const orgId = ctx.auth.orgId;

        if (!userId) {
          throw new ORPCError('UNAUTHORIZED', {
            cause: new Error('User not authenticated'),
            message: 'User not authenticated',
          });
        }

        // Get user from database
        const user = await db
          .select()
          .from(Users)
          .where(eq(Users.id, userId))
          .limit(1)
          .then((rows) => rows[0]);

        if (!user) {
          throw new ORPCError('NOT_FOUND', {
            cause: new Error(`User not found for userId: ${userId}`),
            message: 'User not found',
          });
        }

        if (!orgId) {
          throw new ORPCError('BAD_REQUEST', {
            cause: new Error(
              `No active organization for session: ${input.sessionId}, userId: ${userId}`,
            ),
            message: 'No active organization found for this session',
          });
        }

        // Get organization from database
        const org = await db
          .select()
          .from(Orgs)
          .where(eq(Orgs.id, orgId))
          .limit(1)
          .then((rows) => rows[0]);

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
        if (error instanceof ORPCError) {
          throw error; // Re-throw API errors as-is
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
            throw new ORPCError('NOT_FOUND', {
              cause: error,
              message: 'User, session, or organization not found',
            });
          }

          if (
            error.message.includes('unauthorized') ||
            error.message.includes('401')
          ) {
            throw new ORPCError('UNAUTHORIZED', {
              cause: error,
              message: 'Unauthorized access',
            });
          }

          if (
            error.message.includes('forbidden') ||
            error.message.includes('403')
          ) {
            throw new ORPCError('FORBIDDEN', {
              cause: error,
              message: 'Access forbidden',
            });
          }

          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            cause: error,
            message: 'Failed to verify session or retrieve user data',
          });
        }
        throw new ORPCError('INTERNAL_SERVER_ERROR', {
          cause: new Error(
            `Unknown error during session verification for sessionId: ${input.sessionId}, userId: ${ctx.auth.userId}`,
          ),
          message: 'An unexpected error occurred while verifying session',
        });
      }
    }),
};
