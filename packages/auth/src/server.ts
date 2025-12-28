import { expo } from '@better-auth/expo';
import { db } from '@seawatts/db/client';
import {
  Accounts,
  Invitations,
  OrgMembers,
  Orgs,
  Sessions,
  Users,
  Verifications,
} from '@seawatts/db/schema';
import { createId } from '@seawatts/id';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { lastLoginMethod, oAuthProxy, organization } from 'better-auth/plugins';

import { env } from './env';

// Fallback production URL for OAuth proxy (used when Vercel env vars not available)
const FALLBACK_PRODUCTION_URL = 'https://startup-template-mu.vercel.app';

// Determine the base URL based on environment
const baseUrl =
  env.VERCEL_ENV === 'production'
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : env.VERCEL_ENV === 'preview'
      ? `https://${env.VERCEL_URL}`
      : 'http://localhost:3000';

// Production URL for OAuth proxy - always use the production deployment
// This allows OAuth to work from mobile devices even during local development
const productionUrl = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : FALLBACK_PRODUCTION_URL;

export const auth = betterAuth({
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
  baseURL: baseUrl,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      account: Accounts,
      invitation: Invitations,
      member: OrgMembers,
      organization: Orgs,
      session: Sessions,
      user: Users,
      verification: Verifications,
    },
  }),

  emailAndPassword: {
    enabled: false, // Only using Google OAuth
  },
  // experimental: {
  //   joins: true,
  // },

  plugins: [
    oAuthProxy({
      productionURL: productionUrl,
    }),
    expo(),
    lastLoginMethod({
      storeInDatabase: true,
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
  ],

  secret: env.BETTER_AUTH_SECRET,

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Required for OAuth proxy to work - must match what's registered in Google Cloud Console
      redirectURI: `${productionUrl}/api/auth/callback/google`,
    },
  },

  // Allow any exp:// or expo:// origin for mobile apps
  trustedOrigins: async (request) => {
    const origin = request?.headers?.get('origin') ?? '';
    // Always allow expo schemes
    const allowed = ['expo://', 'exp://'];
    // If origin starts with exp:// or expo://, add it to allowed list
    if (origin.startsWith('exp://') || origin.startsWith('expo://')) {
      allowed.push(origin);
    }
    return allowed;
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
