#!/usr/bin/env bun

/**
 * Sync EAS Secrets Script
 *
 * Syncs environment variables from Infisical to EAS (Expo Application Services)
 * for use during EAS builds.
 *
 * Environment Mapping:
 *   - Infisical 'dev' -> EAS 'development'
 *   - Infisical 'staging' -> EAS 'preview'
 *   - Infisical 'prod' -> EAS 'production'
 *
 * Usage:
 *   bun scripts/sync-eas-secrets.ts
 *   bun scripts/sync-eas-secrets.ts --env dev
 *   bun scripts/sync-eas-secrets.ts --dry-run
 */

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { readInfisicalConfig } from './clone-project/config';
import {
  fetchInfisicalSecretsViaApi,
  getInfisicalToken,
} from './clone-project/infisical';
import type { Secret } from './clone-project/types';
import { p, setVerbose, withSpinner } from './clone-project/utils';

// Path to expo app (EAS commands must run from this directory)
const EXPO_APP_DIR = resolve(import.meta.dir, '../apps/expo');

// ============================================================================
// Constants
// ============================================================================

/** Map Infisical environments to EAS environments */
const ENV_MAPPING = {
  dev: 'development',
  prod: 'production',
  staging: 'preview',
} as const;

type InfisicalEnv = keyof typeof ENV_MAPPING;
type EASEnv = (typeof ENV_MAPPING)[InfisicalEnv];

const INFISICAL_ENVS: InfisicalEnv[] = ['dev', 'staging', 'prod'];

// ============================================================================
// CLI
// ============================================================================

const HELP_TEXT = `
Sync EAS Secrets Script

Syncs environment variables from Infisical to EAS (Expo Application Services).

Environment Mapping:
  - Infisical 'dev'     -> EAS 'development'
  - Infisical 'staging' -> EAS 'preview'
  - Infisical 'prod'    -> EAS 'production'

Usage:
  bun scripts/sync-eas-secrets.ts [options]

Options:
  --env <env>           Sync only specific Infisical environment (dev, staging, prod)
  --dry-run             Preview changes without applying
  --force               Overwrite existing secrets in EAS
  --verbose, -v         Show detailed output
  --help                Show this help message

Environment Variables:
  INFISICAL_TOKEN                Infisical access token (Token Auth)
  INFISICAL_CLIENT_ID            Infisical client ID (Universal Auth)
  INFISICAL_CLIENT_SECRET        Infisical client secret (Universal Auth)

Examples:
  # Sync all environments (requires INFISICAL_TOKEN or Universal Auth env vars)
  bun scripts/sync-eas-secrets.ts

  # Sync only development secrets
  bun scripts/sync-eas-secrets.ts --env dev

  # Preview changes without applying
  bun scripts/sync-eas-secrets.ts --dry-run

  # Force overwrite existing secrets
  bun scripts/sync-eas-secrets.ts --force

  # With token
  INFISICAL_TOKEN=xxx bun scripts/sync-eas-secrets.ts
`;

interface CliOptions {
  env?: InfisicalEnv;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

function parseCliOptions(): CliOptions {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      'dry-run': { default: false, type: 'boolean' },
      env: { type: 'string' },
      force: { default: false, type: 'boolean' },
      help: { default: false, type: 'boolean' },
      verbose: { default: false, short: 'v', type: 'boolean' },
    },
  });

  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const env = values.env as InfisicalEnv | undefined;
  if (env && !INFISICAL_ENVS.includes(env)) {
    p.log.error(`Invalid environment: ${env}`);
    p.log.info(`Available environments: ${INFISICAL_ENVS.join(', ')}`);
    process.exit(1);
  }

  return {
    dryRun: values['dry-run'] ?? false,
    env,
    force: values.force ?? false,
    verbose: values.verbose ?? false,
  };
}

// ============================================================================
// EAS Secret Management
// ============================================================================

interface EASSecret {
  name: string;
  type: string;
  environments: string[];
}

/**
 * Run an EAS CLI command from the expo app directory
 */
async function runEASCommand(
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bunx', 'eas-cli', ...args], {
    cwd: EXPO_APP_DIR,
    stderr: 'pipe',
    stdout: 'pipe',
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return { exitCode, stderr, stdout };
}

/**
 * List existing secrets in EAS for a specific environment
 */
async function listEASSecrets(easEnv: EASEnv): Promise<EASSecret[]> {
  const { stdout, exitCode } = await runEASCommand([
    'env:list',
    `--environment=${easEnv}`,
    '--format=json',
    '--non-interactive',
  ]);

  if (exitCode !== 0) {
    // If no secrets exist, the command might fail or return empty
    return [];
  }

  try {
    const parsed = JSON.parse(stdout);
    // EAS returns an array of secrets
    if (Array.isArray(parsed)) {
      return parsed as EASSecret[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Create or update a secret in EAS
 */
async function createEASSecret(
  name: string,
  value: string,
  easEnv: EASEnv,
  force: boolean,
): Promise<{ success: boolean; error?: string }> {
  const args = [
    'env:create',
    `--name=${name}`,
    `--value=${value}`,
    `--environment=${easEnv}`,
    '--scope=project',
    '--type=string',
    '--visibility=secret',
    '--non-interactive',
  ];

  if (force) {
    args.push('--force');
  }

  const { exitCode, stderr, stdout } = await runEASCommand(args);

  if (exitCode !== 0) {
    // Extract meaningful error from output
    const errorMsg = stderr || stdout || 'Unknown error';
    return { error: errorMsg.trim(), success: false };
  }

  return { success: true };
}

// ============================================================================
// Sync Logic
// ============================================================================

interface SyncResult {
  infisicalEnv: InfisicalEnv;
  easEnv: EASEnv;
  created: string[];
  skipped: string[];
  failed: Array<{ key: string; error: string }>;
}

/**
 * Sync secrets from Infisical to EAS for a specific environment
 */
async function syncEnvironment(
  infisicalToken: string,
  projectId: string,
  infisicalEnv: InfisicalEnv,
  options: { dryRun: boolean; force: boolean },
): Promise<SyncResult> {
  const easEnv = ENV_MAPPING[infisicalEnv];
  const result: SyncResult = {
    created: [],
    easEnv,
    failed: [],
    infisicalEnv,
    skipped: [],
  };

  // Export secrets from Infisical via API
  let secrets: Secret[];
  try {
    secrets = await fetchInfisicalSecretsViaApi(
      infisicalToken,
      projectId,
      infisicalEnv,
    );
  } catch (error) {
    p.log.warn(
      `Could not export secrets for ${infisicalEnv}: ${error instanceof Error ? error.message : error}`,
    );
    return result;
  }

  if (secrets.length === 0) {
    p.log.info(`No secrets found in Infisical for ${infisicalEnv}`);
    return result;
  }

  // Get existing EAS secrets for comparison
  let existingSecrets: EASSecret[] = [];
  if (!options.force) {
    try {
      existingSecrets = await listEASSecrets(easEnv);
    } catch {
      // Ignore errors listing secrets
    }
  }
  const existingNames = new Set(existingSecrets.map((s) => s.name));

  // Sync each secret
  for (const secret of secrets) {
    const { key, value } = secret;

    // Skip empty values
    if (!value) {
      result.skipped.push(key);
      continue;
    }

    // Skip if already exists and not forcing
    if (!options.force && existingNames.has(key)) {
      result.skipped.push(key);
      continue;
    }

    if (options.dryRun) {
      result.created.push(key);
      continue;
    }

    // Create/update the secret
    const { success, error } = await createEASSecret(
      key,
      value,
      easEnv,
      options.force,
    );

    if (success) {
      result.created.push(key);
    } else {
      result.failed.push({ error: error ?? 'Unknown error', key });
    }
  }

  return result;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseCliOptions();

  if (options.verbose) {
    setVerbose(true);
  }

  console.clear();
  p.intro('🔄 Sync Infisical to EAS');

  if (options.verbose) p.log.info('Verbose mode enabled');
  if (options.dryRun) p.log.warn('DRY RUN MODE - No changes will be made');
  if (options.force) p.log.warn('FORCE MODE - Will overwrite existing secrets');

  try {
    // Authenticate with Infisical
    const infisicalToken = await withSpinner(
      'Authenticating with Infisical...',
      () => getInfisicalToken(),
      'Authenticated with Infisical',
    );

    // Read Infisical project ID
    const config = await withSpinner(
      'Reading Infisical config...',
      () => readInfisicalConfig(),
      'Read Infisical config',
    );

    const projectId = config.workspaceId;
    p.log.success(`Infisical project: ${projectId}`);

    // Determine which environments to sync
    const envsToSync: InfisicalEnv[] = options.env
      ? [options.env]
      : INFISICAL_ENVS;

    p.log.info(`Syncing environments: ${envsToSync.join(', ')}`);

    // Sync each environment
    const results: SyncResult[] = [];

    for (const env of envsToSync) {
      const easEnv = ENV_MAPPING[env];
      p.log.step(`Syncing ${env} -> ${easEnv}...`);

      const result = await withSpinner(
        `Syncing ${env} to ${easEnv}...`,
        () => syncEnvironment(infisicalToken, projectId, env, options),
        `Synced ${env} to ${easEnv}`,
      );

      results.push(result);
    }

    // Show summary
    p.outro('✨ Sync complete!');

    console.log('\n📊 Summary:\n');
    for (const result of results) {
      console.log(`  ${result.infisicalEnv} -> ${result.easEnv}:`);
      if (result.created.length > 0) {
        console.log(
          `    ✅ ${options.dryRun ? 'Would create' : 'Created'}: ${result.created.length} secrets`,
        );
        if (options.verbose) {
          for (const key of result.created) {
            console.log(`       - ${key}`);
          }
        }
      }
      if (result.skipped.length > 0) {
        console.log(`    ⏭️  Skipped: ${result.skipped.length} secrets`);
        if (options.verbose) {
          for (const key of result.skipped) {
            console.log(`       - ${key}`);
          }
        }
      }
      if (result.failed.length > 0) {
        console.log(`    ❌ Failed: ${result.failed.length} secrets`);
        for (const { key, error } of result.failed) {
          console.log(`       - ${key}: ${error}`);
        }
      }
      console.log('');
    }

    // Show link to EAS dashboard
    if (!options.dryRun) {
      p.note(
        'https://expo.dev/accounts/seawatts/projects/startuptemplate/environment-variables',
        '🔐 View in EAS Dashboard',
      );
    }

    console.log('');
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
