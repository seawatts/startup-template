// Infisical types
export interface InfisicalConfig {
  workspaceId: string;
  defaultEnvironment?: string;
  gitBranchToEnvironmentMapping?: null | Record<string, string>;
}

export interface InfisicalWorkspace {
  id: string;
  name: string;
  slug: string;
  organization: string;
}

export interface InfisicalOrg {
  id: string;
  name: string;
  slug: string;
}

export interface Secret {
  key: string;
  value: string;
  workspace?: string;
  type?: string;
}

// Supabase types
export interface SupabaseApiKey {
  name: string;
  api_key: string;
}

export interface SupabaseProject {
  id: string;
  name: string;
  region: string;
  organization_id: string;
}

export interface SupabaseOrg {
  id: string;
  name: string;
}

export interface TomlConfig {
  api: { port: number };
  db: { port: number };
  [key: string]: unknown;
}

// PostHog types
export interface PostHogOrg {
  id: string;
  name: string;
  slug: string;
}

export interface PostHogProject {
  id: number;
  name: string;
  api_token: string;
  organization: string;
}

export type PostHogRegion = 'us' | 'eu';

// Vercel types
export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  link?: {
    type: string;
    repo: string;
    repoId: number;
    org: string;
    gitCredentialId: string;
    productionBranch: string;
  };
}

export interface VercelTeam {
  id: string;
  slug: string;
  name: string;
}

// Environment types
export const ENVIRONMENTS = ['dev', 'staging', 'prod'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

// ============================================================================
// Sync Service Types
// ============================================================================

export const SYNC_SERVICES = ['supabase', 'posthog', 'vercel'] as const;
export type SyncService = (typeof SYNC_SERVICES)[number];

/** Service metadata for display */
export const SERVICE_INFO: Record<
  SyncService,
  { label: string; hint: string }
> = {
  posthog: { hint: 'Product analytics', label: 'PostHog' },
  supabase: { hint: 'Database & authentication', label: 'Supabase' },
  vercel: { hint: 'Deployment & hosting', label: 'Vercel' },
};

/** Variables that can be auto-fetched from each service */
export const SERVICE_AUTO_SECRETS: Record<SyncService, string[]> = {
  posthog: [
    'POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'POSTHOG_HOST',
    'NEXT_PUBLIC_POSTHOG_HOST',
  ],
  supabase: [
    'SUPABASE_PROJECT_ID',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'POSTGRES_URL',
    'POSTGRES_DATABASE',
  ],
  vercel: [],
};

/** Variables that must be prompted from the user */
export const SERVICE_MANUAL_SECRETS: Record<
  SyncService,
  Array<{ key: string; hint?: string; secret?: boolean }>
> = {
  posthog: [
    {
      hint: 'Create at https://us.posthog.com/settings/user-api-keys',
      key: 'POSTHOG_PERSONAL_API_KEY',
      secret: true,
    },
  ],
  supabase: [
    {
      hint: 'Database password (used when project was created)',
      key: 'POSTGRES_PASSWORD',
      secret: true,
    },
  ],
  vercel: [
    {
      hint: 'Create at https://vercel.com/account/tokens',
      key: 'VERCEL_TOKEN',
      secret: true,
    },
    { hint: 'Your Vercel team slug (from team settings)', key: 'TURBO_TEAM' },
    {
      hint: 'Create at https://vercel.com/account/tokens',
      key: 'TURBO_TOKEN',
      secret: true,
    },
  ],
};

/** All variables for a service (auto + manual) */
export const SERVICE_ALL_SECRETS: Record<SyncService, string[]> = {
  posthog: [...SERVICE_AUTO_SECRETS.posthog, 'POSTHOG_PERSONAL_API_KEY'],
  supabase: [...SERVICE_AUTO_SECRETS.supabase, 'POSTGRES_PASSWORD'],
  vercel: ['VERCEL_TOKEN', 'TURBO_TEAM', 'TURBO_TOKEN'],
};

/** Fetched secrets from a service */
export interface FetchedSecrets {
  service: SyncService;
  /** Secrets for dev environment */
  dev: Record<string, string>;
  /** Secrets for staging/prod environments */
  production: Record<string, string>;
}

/** Secret info for selection UI */
export interface SecretInfo {
  key: string;
  value: string;
  service: SyncService;
  hasValue: boolean;
}
