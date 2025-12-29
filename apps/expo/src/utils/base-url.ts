import Constants from 'expo-constants';

const PRODUCTION_URL = 'https://startup-template-mu.vercel.app';

/**
 * Gets the local development server URL using the device's network IP.
 */
function getLocalUrl(): string | null {
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':')[0];

  if (!localhost) {
    return null;
  }

  return `http://${localhost}:3000`;
}

/**
 * Gets the base URL for the auth server.
 *
 * ALWAYS uses production URL because:
 * 1. Google OAuth doesn't allow private IPs (192.168.x.x) as redirect URIs
 * 2. The production server now accepts exp:// in trustedOrigins
 * 3. After OAuth, production server redirects to exp://... or startuptemplate://...
 *    which the mobile device handles as a deep link
 */
export function getAuthBaseUrl(): string {
  console.log('[AUTH BASE URL] Using production:', PRODUCTION_URL);
  return PRODUCTION_URL;
}

/**
 * Gets the base URL for API calls (tRPC, etc).
 * Always uses local server in development for faster iteration.
 */
export function getApiBaseUrl(): string {
  const localUrl = getLocalUrl();

  if (localUrl) {
    console.log('[API BASE URL] Using local:', localUrl);
    return localUrl;
  }

  console.log('[API BASE URL] Using production:', PRODUCTION_URL);
  return PRODUCTION_URL;
}

/**
 * @deprecated Use getAuthBaseUrl() for auth or getApiBaseUrl() for API calls
 */
export function getBaseUrl(): string {
  return getAuthBaseUrl();
}
