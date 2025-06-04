import type { RouterOutputs } from '@acme/api';
import { createClient } from '@acme/api/cli';

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
