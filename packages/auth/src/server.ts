import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { lastLoginMethod, oAuthProxy, organization } from 'better-auth/plugins';
import { env } from './env';
import { sessionOptions } from './session-options';

// Fallback production URL for OAuth proxy (used when Vercel env vars not available)
const FALLBACK_PRODUCTION_URL = 'https://startup-template-mu.vercel.app';

// Production URL for OAuth proxy - always use the production deployment
// This allows OAuth to work from mobile devices even during local development
const productionUrl = env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  : FALLBACK_PRODUCTION_URL;

export const auth = betterAuth({
  // Cookie, database, secret and session settings, shared with the
  // session-only reader (session-reader.ts).
  ...sessionOptions,

  emailAndPassword: {
    enabled: false, // Only using Google OAuth
  },
  // Debug: log API errors
  onAPIError: {
    onError(error) {
      console.error('[BETTER AUTH ERROR]', error);
    },
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

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // NOTE: Commented out for now to get expo locally working. However, we might add this back later because it might be required for OAuth proxy to work - must match what's registered in Google Cloud Console
      // redirectURI: `${productionUrl}/api/auth/callback/google`,
    },
  },

  // Trusted origins for CORS and deep linking
  // The expo plugin checks if redirect location.startsWith(trustedOrigin)
  // so we just need the scheme prefix without wildcards
  trustedOrigins: [
    // Production app scheme
    'startuptemplate://',

    // Development app scheme (different bundle ID)
    'startuptemplate-development://',

    // Preview app scheme (different bundle ID)
    'startuptemplate-preview://',

    // Expo Go development - MUST be included even in production
    // because Expo Go on a device talks to the production server
    'exp://',

    // Local development servers
    ...(process.env.NODE_ENV === 'development'
      ? ['http://192.168.', 'http://localhost:3000']
      : []),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
