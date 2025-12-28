import { expo } from '@better-auth/expo';
import { db } from '@seawatts/db/client';
import { createId } from '@seawatts/id';
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod, oAuthProxy, organization } from 'better-auth/plugins';
import { env } from './env';

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  discordClientId: string;
  discordClientSecret: string;
  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    advanced: {
      database: {
        generateId: ({ model }) => {
          const prefixMap: Record<string, string> = {
            account: 'acc',
            invitation: 'inv',
            member: 'member',
            organization: 'org',
            session: 'session',
            user: 'user',
            verification: 'ver',
          };
          const prefix = prefixMap[model] ?? model.slice(0, 3);
          return createId({ prefix });
        },
      },
    },
    baseURL: options.baseUrl,
    database: drizzleAdapter(db, {
      provider: 'pg',
      // schema: {
      //   account: Accounts,
      //   invitation: Invitations,
      //   member: OrgMembers,
      //   organization: Orgs,
      //   session: Sessions,
      //   user: Users,
      //   verification: Verifications,
      // },
    }),
    emailAndPassword: {
      enabled: false, // Only using Google OAuth
    },
    onAPIError: {
      onError(error, ctx) {
        console.error('BETTER AUTH API ERROR', error, ctx);
      },
    },
    plugins: [
      lastLoginMethod({
        storeInDatabase: true,
      }),
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      organization({
        allowUserToCreateOrganization: true,
        invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
        membershipLimit: 50,
        organizationLimit: 10,
        sendInvitationEmail: async ({ email, organization, inviter }) => {
          // TODO: Implement email sending using @seawatts/email package
          console.log(
            'Sending invitation email to',
            email,
            'for organization',
            organization.name,
            'from',
            inviter.user.name,
          );
        },
      }),
      expo(),
      ...(options.extraPlugins ?? []),
    ],
    secret: options.secret,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    trustedOrigins: [env.BETTER_AUTH_URL, 'http://localhost:3000', 'expo://'],
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth['$Infer']['Session'];

// Re-export middleware utilities
export {
  type AuthMiddlewareOptions,
  createAuthMiddleware,
  getAuthHeaders,
  getSessionFromRequest,
} from './middleware';
