import { createORPCClient } from '@orpc/client';
import type { RouterClient } from '@orpc/server';
import { type ClientConfig, createDefaultLink } from './react/config';
import type { AppRouter } from './root';

export type ApiClient = RouterClient<AppRouter>;

// The typed HTTP client for anything outside React: the CLI, the editor
// extension, scripts. `await client.org.current()`.
export const createClient = (config?: ClientConfig): ApiClient =>
  createORPCClient(createDefaultLink(config));
