import type { RouterOutputs } from '@seawatts/api';
import { createClient } from '@seawatts/api/client';

export type ApiClient = ReturnType<typeof createClient>;
export type AuthUser = RouterOutputs['auth']['verifySessionToken']['user'];

export function createApiClient(authToken?: string): ApiClient {
  return createClient({
    authToken,
    sessionCookie: authToken,
  });
}

// Export a default client instance without auth token
export const defaultClient = createApiClient();
