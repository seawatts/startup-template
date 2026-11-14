import { betterAuth } from 'better-auth';
import { lastLoginMethod, organization } from 'better-auth/plugins';
import type { Session } from './server';
import { sessionOptions } from './session-options';

// Reads the signed-in session for API requests and the route proxy. The
// full instance in server.ts carries every way to sign in (OAuth providers,
// the OAuth proxy, the Expo plugin, and whatever an app adds later: single
// sign-on, passkeys, SCIM), and a cold server evaluates all of it before it
// can answer anything. A read only needs the session. This instance shares
// the secret, cookie, database and session settings (session-options.ts)
// and only the plugins that add session or user fields, so it returns the
// same session as the full one (tests/session-reader.test.ts). It signs no
// one in and changes nothing but the session's own expiry refresh.
//
// When server.ts gains a plugin that adds a session or user field, add it
// here too; a plugin that only adds sign-in routes stays out.
const reader = betterAuth({
  ...sessionOptions,
  plugins: [lastLoginMethod({ storeInDatabase: true }), organization()],
});

export async function readSession(headers: Headers): Promise<Session | null> {
  return (await reader.api.getSession({ headers })) as Session | null;
}
