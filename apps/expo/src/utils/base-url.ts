import Constants from 'expo-constants';

// Production URL for fallback when not in development
const PRODUCTION_URL = 'https://startup-template-mu.vercel.app';

/**
 * Gets the base URL for the auth server.
 *
 * In development, this returns the local Next.js server URL using the
 * device's network IP. This is required for the OAuth proxy to work properly.
 *
 * In production, this returns the production URL.
 */
export function getBaseUrl(): string {
  // Get the debugger host from Expo constants (e.g., "192.168.0.19:8081")
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':')[0];

  console.log(
    '[AUTH BASE URL] debuggerHost:',
    debuggerHost,
    'localhost:',
    localhost,
  );

  if (!localhost) {
    // In production builds or when we can't determine the host, use production URL
    console.log('[AUTH BASE URL] Using production URL:', PRODUCTION_URL);
    return PRODUCTION_URL;
  }

  // Return local Next.js server URL (port 3000)
  const url = `http://${localhost}:3000`;
  // const url = 'http://localhost:8081'
  console.log('[AUTH BASE URL] Using local URL:', url);
  return url;
}
