/**
 * Sync Service Module
 *
 * Orchestrates fetching secrets from various services and syncing them to Infisical.
 */

import { readSupabaseConfig } from './config';
import { exportInfisicalSecrets, importInfisicalSecrets } from './infisical';
import { getPostHogProjectSecrets, selectPostHogProject } from './posthog';
import { getSupabaseProjectSecrets, selectSupabaseProject } from './supabase';
import {
  ENVIRONMENTS,
  type Environment,
  type FetchedSecrets,
  type PostHogRegion,
  SERVICE_MANUAL_SECRETS,
  type SecretInfo,
  type SyncService,
} from './types';
import { p, withSpinner } from './utils';

// ============================================================================
// Types
// ============================================================================

export interface SyncOptions {
  /** Target Infisical project ID */
  targetProjectId: string;
  /** Services to sync */
  services: SyncService[];
  /** PostHog API key (required if syncing PostHog) */
  posthogApiKey?: string;
  /** PostHog region */
  posthogRegion?: PostHogRegion;
  /** Skip interactive prompts */
  noInteractive?: boolean;
  /** Preview changes without applying */
  dryRun?: boolean;
  /** Specific secrets to sync (if not provided, prompts user) */
  selectedSecrets?: string[];
}

export interface SyncResult {
  service: SyncService;
  secretsUpdated: number;
  environments: Environment[];
}

// ============================================================================
// Prompt for Manual Secrets
// ============================================================================

/**
 * Prompt user for secrets that cannot be auto-fetched
 */
export async function promptForManualSecrets(
  service: SyncService,
): Promise<Record<string, string>> {
  const manualSecrets = SERVICE_MANUAL_SECRETS[service];
  const secrets: Record<string, string> = {};

  for (const { key, hint } of manualSecrets) {
    const value = await p.text({
      message: `Enter ${key}:`,
      placeholder: hint || `Enter value for ${key}`,
      validate: (v: string) => {
        if (!v?.trim()) return `${key} is required`;
      },
    });

    if (p.isCancel(value)) {
      throw new Error('Cancelled by user');
    }

    secrets[key] = value as string;
  }

  return secrets;
}

// ============================================================================
// Service-Specific Sync Functions
// ============================================================================

/**
 * Sync Supabase secrets
 */
export async function syncSupabase(
  noInteractive?: boolean,
): Promise<FetchedSecrets> {
  // Select project
  const project = await selectSupabaseProject(noInteractive);

  // Prompt for DB password
  const dbPassword = await p.text({
    message: 'Enter the database password for this project:',
    placeholder: 'The password used when the project was created',
    validate: (v: string) => {
      if (!v?.trim()) return 'Database password is required';
    },
  });

  if (p.isCancel(dbPassword)) {
    throw new Error('Cancelled by user');
  }

  // Get local ports from supabase config
  let localApiPort = 54321;
  let localDbPort = 54322;
  try {
    const supabaseConfig = await readSupabaseConfig();
    localApiPort = supabaseConfig.api.port;
    localDbPort = supabaseConfig.db.port;
  } catch {
    // Use defaults
  }

  // Fetch secrets
  const secrets = await withSpinner(
    'Fetching Supabase credentials...',
    () =>
      getSupabaseProjectSecrets(
        project,
        dbPassword as string,
        localApiPort,
        localDbPort,
      ),
    `Fetched credentials for ${project.name}`,
  );

  return {
    dev: secrets.dev,
    production: secrets.production,
    service: 'supabase',
  };
}

/**
 * Sync PostHog secrets
 */
export async function syncPostHog(
  personalApiKey: string,
  region: PostHogRegion,
  noInteractive?: boolean,
): Promise<FetchedSecrets> {
  // Select project
  const { project } = await selectPostHogProject(
    personalApiKey,
    region,
    noInteractive,
  );

  // Get secrets
  const secrets = getPostHogProjectSecrets(project, region);

  // Also include the personal API key
  const allSecrets = {
    ...secrets.secrets,
    POSTHOG_PERSONAL_API_KEY: personalApiKey,
  };

  return {
    dev: allSecrets,
    production: allSecrets,
    service: 'posthog',
  };
}

/**
 * Sync Vercel secrets (all manual)
 */
export async function syncVercel(): Promise<FetchedSecrets> {
  const secrets = await promptForManualSecrets('vercel');

  return {
    dev: secrets,
    production: secrets,
    service: 'vercel',
  };
}

// ============================================================================
// Secret Selection
// ============================================================================

/**
 * Build list of available secrets from fetched data
 */
export function buildSecretsList(
  fetchedSecrets: FetchedSecrets[],
): SecretInfo[] {
  const secrets: SecretInfo[] = [];

  for (const fetched of fetchedSecrets) {
    // Use production secrets as the canonical list (dev may have local overrides)
    const allKeys = new Set([
      ...Object.keys(fetched.dev),
      ...Object.keys(fetched.production),
    ]);

    for (const key of allKeys) {
      const value = fetched.production[key] || fetched.dev[key] || '';
      secrets.push({
        hasValue: !!value,
        key,
        service: fetched.service,
        value,
      });
    }
  }

  // Sort by service, then by key
  return secrets.sort((a, b) => {
    if (a.service !== b.service) return a.service.localeCompare(b.service);
    return a.key.localeCompare(b.key);
  });
}

/**
 * Prompt user to select which secrets to sync
 */
export async function promptForSecretSelection(
  secrets: SecretInfo[],
  noInteractive?: boolean,
): Promise<string[]> {
  if (noInteractive) {
    // In non-interactive mode, sync all secrets
    return secrets.map((s) => s.key);
  }

  if (secrets.length === 0) {
    return [];
  }

  const selected = await p.multiselect({
    initialValues: secrets.map((s) => s.key),
    message: 'Select which environment variables to sync:',
    options: secrets.map((secret) => ({
      hint: secret.hasValue
        ? `${secret.service} • ${maskValue(secret.value)}`
        : `${secret.service} • (no value)`,
      label: secret.key,
      value: secret.key,
    })),
    required: false,
  });

  if (p.isCancel(selected)) {
    throw new Error('Cancelled by user');
  }

  return selected as string[];
}

/**
 * Mask a secret value for display (show first/last 4 chars)
 */
function maskValue(value: string): string {
  if (!value) return '(empty)';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

/**
 * Filter fetched secrets to only include selected keys
 */
export function filterSecrets(
  fetchedSecrets: FetchedSecrets[],
  selectedKeys: string[],
): FetchedSecrets[] {
  const keySet = new Set(selectedKeys);

  return fetchedSecrets.map((fetched) => ({
    dev: Object.fromEntries(
      Object.entries(fetched.dev).filter(([key]) => keySet.has(key)),
    ),
    production: Object.fromEntries(
      Object.entries(fetched.production).filter(([key]) => keySet.has(key)),
    ),
    service: fetched.service,
  }));
}

// ============================================================================
// Main Sync Orchestration
// ============================================================================

/**
 * Fetch secrets for a single service
 */
export async function fetchServiceSecrets(
  service: SyncService,
  options: {
    posthogApiKey?: string;
    posthogRegion?: PostHogRegion;
    noInteractive?: boolean;
  },
): Promise<FetchedSecrets> {
  switch (service) {
    case 'supabase':
      return syncSupabase(options.noInteractive);

    case 'posthog':
      if (!options.posthogApiKey) {
        throw new Error(
          'PostHog personal API key is required to sync PostHog secrets',
        );
      }
      return syncPostHog(
        options.posthogApiKey,
        options.posthogRegion || 'us',
        options.noInteractive,
      );

    case 'vercel':
      return syncVercel();
  }
}

/**
 * Fetch existing secrets from Infisical project
 */
async function fetchExistingInfisicalSecrets(projectId: string): Promise<{
  secrets: SecretInfo[];
  byEnv: Record<Environment, Record<string, string>>;
}> {
  const secrets: SecretInfo[] = [];
  const seenKeys = new Set<string>();
  const byEnv: Record<Environment, Record<string, string>> = {
    dev: {},
    prod: {},
    staging: {},
  };

  // Fetch from all environments
  for (const env of ENVIRONMENTS) {
    try {
      const envSecrets = await exportInfisicalSecrets(projectId, env);
      for (const secret of envSecrets) {
        byEnv[env][secret.key] = secret.value;
        if (!seenKeys.has(secret.key)) {
          seenKeys.add(secret.key);
          secrets.push({
            hasValue: !!secret.value,
            key: secret.key,
            service: 'supabase', // Will be shown as "existing"
            value: secret.value,
          });
        }
      }
    } catch {
      // Ignore errors - environment might not exist
    }
  }

  return { byEnv, secrets };
}

/**
 * Sync secrets from multiple services to Infisical
 */
export async function syncSecretsToInfisical(
  options: SyncOptions,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Step 1: Fetch existing secrets from Infisical first
  // This allows us to skip prompting for credentials that already exist
  let existingSecrets: SecretInfo[] = [];

  try {
    const existing = await withSpinner(
      'Fetching existing secrets from Infisical...',
      () => fetchExistingInfisicalSecrets(options.targetProjectId),
      'Fetched existing secrets',
    );
    existingSecrets = existing.secrets;
    p.log.success(
      `Found ${existingSecrets.length} existing secrets in Infisical`,
    );
  } catch (error) {
    p.log.warn(
      `Could not fetch existing secrets: ${error instanceof Error ? error.message : error}`,
    );
  }

  // Create a map for quick lookup of existing secret values
  const existingSecretsMap = new Map<string, string>();
  for (const secret of existingSecrets) {
    if (secret.value) {
      existingSecretsMap.set(secret.key, secret.value);
    }
  }

  // Step 2: For each service, check if we have the required credentials in Infisical
  // If we do, use them instead of prompting
  const allFetched: FetchedSecrets[] = [];

  for (const service of options.services) {
    p.log.step(`Processing ${service}...`);

    try {
      // Check for existing credentials based on service
      if (service === 'supabase') {
        const existingPassword = existingSecretsMap.get('POSTGRES_PASSWORD');
        if (existingPassword) {
          p.log.success(
            'Found POSTGRES_PASSWORD in Infisical, using existing value',
          );
          // Fetch Supabase project using existing password
          const fetched = await syncSupabaseWithCredentials(
            existingPassword,
            options.noInteractive,
          );
          allFetched.push(fetched);
        } else {
          const fetched = await fetchServiceSecrets(service, {
            noInteractive: options.noInteractive,
          });
          allFetched.push(fetched);
        }
      } else if (service === 'posthog') {
        const existingApiKey =
          options.posthogApiKey ||
          existingSecretsMap.get('POSTHOG_PERSONAL_API_KEY');
        if (existingApiKey) {
          p.log.success('Using existing PostHog API key');
          const fetched = await fetchServiceSecrets(service, {
            noInteractive: options.noInteractive,
            posthogApiKey: existingApiKey,
            posthogRegion: options.posthogRegion,
          });
          allFetched.push(fetched);
        } else {
          const fetched = await fetchServiceSecrets(service, {
            noInteractive: options.noInteractive,
            posthogApiKey: options.posthogApiKey,
            posthogRegion: options.posthogRegion,
          });
          allFetched.push(fetched);
        }
      } else if (service === 'vercel') {
        // Check if Vercel credentials exist
        const existingToken = existingSecretsMap.get('VERCEL_TOKEN');
        const existingTurboTeam = existingSecretsMap.get('TURBO_TEAM');
        const existingTurboToken = existingSecretsMap.get('TURBO_TOKEN');

        if (existingToken && existingTurboTeam && existingTurboToken) {
          p.log.success(
            'Found Vercel credentials in Infisical, using existing values',
          );
          allFetched.push({
            dev: {
              TURBO_TEAM: existingTurboTeam,
              TURBO_TOKEN: existingTurboToken,
              VERCEL_TOKEN: existingToken,
            },
            production: {
              TURBO_TEAM: existingTurboTeam,
              TURBO_TOKEN: existingTurboToken,
              VERCEL_TOKEN: existingToken,
            },
            service: 'vercel',
          });
        } else {
          const fetched = await fetchServiceSecrets(service, {
            noInteractive: options.noInteractive,
          });
          allFetched.push(fetched);
        }
      }
    } catch (error) {
      p.log.error(
        `Failed to fetch ${service}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // Step 3: Build combined list of all secrets (existing + new from services)
  const serviceSecrets = buildSecretsList(allFetched);

  // Merge: start with existing, add/update with service secrets
  const allSecretsMap = new Map<string, SecretInfo>();

  for (const secret of existingSecrets) {
    allSecretsMap.set(secret.key, {
      ...secret,
      service: 'supabase' as SyncService,
    });
  }

  for (const secret of serviceSecrets) {
    allSecretsMap.set(secret.key, secret);
  }

  const allSecrets = Array.from(allSecretsMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  if (allSecrets.length === 0) {
    p.log.warn('No secrets found');
    return results;
  }

  // Step 4: Select which secrets to sync
  let selectedKeys: string[];
  if (options.selectedSecrets) {
    selectedKeys = options.selectedSecrets;
  } else {
    // Mark secrets as new/existing/update
    const secretsWithSource = allSecrets.map((s) => {
      const isFromService = serviceSecrets.some((ss) => ss.key === s.key);
      const isExisting = existingSecrets.some((es) => es.key === s.key);

      let source: string = s.service;
      if (isFromService && isExisting) {
        source = `${s.service} → update`;
      } else if (isFromService) {
        source = `${s.service} → new`;
      } else {
        source = 'existing';
      }

      return { ...s, service: source as SyncService };
    });

    selectedKeys = await promptForSecretSelection(
      secretsWithSource,
      options.noInteractive,
    );
  }

  if (selectedKeys.length === 0) {
    p.log.warn('No secrets selected');
    return results;
  }

  p.log.success(`Selected ${selectedKeys.length} secrets to sync`);

  // Step 5: Collect secrets per environment
  const filteredSecrets = filterSecrets(allFetched, selectedKeys);
  const secretsByEnv: Record<Environment, Record<string, string>> = {
    dev: {},
    prod: {},
    staging: {},
  };

  for (const fetched of filteredSecrets) {
    Object.assign(secretsByEnv.dev, fetched.dev);
    Object.assign(secretsByEnv.staging, fetched.production);
    Object.assign(secretsByEnv.prod, fetched.production);

    results.push({
      environments: [...ENVIRONMENTS],
      secretsUpdated: Object.keys(fetched.production).length,
      service: fetched.service,
    });
  }

  // Step 6: Import to Infisical
  if (options.dryRun) {
    p.log.info('Dry run - would import:');
    for (const env of ENVIRONMENTS) {
      const keys = Object.keys(secretsByEnv[env]);
      p.log.info(`  ${env}: ${keys.length} secrets`);
      if (keys.length > 0 && keys.length <= 10) {
        for (const key of keys) {
          p.log.info(`    • ${key}`);
        }
      }
    }
  } else {
    await withSpinner(
      'Importing secrets to Infisical...',
      async (update) => {
        for (const env of ENVIRONMENTS) {
          if (Object.keys(secretsByEnv[env]).length > 0) {
            update(`Importing to ${env}...`);
            await importInfisicalSecrets(
              options.targetProjectId,
              env,
              secretsByEnv[env],
            );
          }
        }
      },
      'Imported secrets to Infisical',
    );
  }

  return results;
}

/**
 * Sync Supabase with an existing password (skip prompt)
 */
async function syncSupabaseWithCredentials(
  dbPassword: string,
  noInteractive?: boolean,
): Promise<FetchedSecrets> {
  const project = await selectSupabaseProject(noInteractive);

  // Get local ports from supabase config
  let localApiPort = 54321;
  let localDbPort = 54322;
  try {
    const supabaseConfig = await readSupabaseConfig();
    localApiPort = supabaseConfig.api.port;
    localDbPort = supabaseConfig.db.port;
  } catch {
    // Use defaults
  }

  const secrets = await withSpinner(
    'Fetching Supabase credentials...',
    () =>
      getSupabaseProjectSecrets(project, dbPassword, localApiPort, localDbPort),
    `Fetched credentials for ${project.name}`,
  );

  return {
    dev: secrets.dev,
    production: secrets.production,
    service: 'supabase',
  };
}

// ============================================================================
// Summary Display
// ============================================================================

export function showSyncSummary(results: SyncResult[], dryRun?: boolean): void {
  if (results.length === 0) {
    p.note('No services were synced.', '📋 Summary');
    return;
  }

  const lines: string[] = [];

  if (dryRun) {
    lines.push('(Dry run - no changes made)\n');
  }

  for (const result of results) {
    lines.push(`✓ ${result.service}: ${result.secretsUpdated} secrets`);
  }

  p.note(lines.join('\n'), '📋 Sync Summary');
}
