#!/usr/bin/env bun
/**
 * Sync Secrets Script
 *
 * Syncs environment variables from various services (Supabase, PostHog, Vercel)
 * to a selected Infisical project. Allows selecting specific source projects
 * from each service.
 *
 * Usage:
 *   bun scripts/sync-secrets.ts
 */

import { parseArgs } from 'node:util';

import { readInfisicalConfig } from './clone-project/config';
import {
  getInfisicalToken,
  getOrSelectInfisicalOrg,
  selectInfisicalProject,
} from './clone-project/infisical';
import { showSyncSummary, syncSecretsToInfisical } from './clone-project/sync';
import {
  type PostHogRegion,
  SERVICE_INFO,
  SYNC_SERVICES,
  type SyncService,
} from './clone-project/types';
import { p, setVerbose, withSpinner } from './clone-project/utils';

// ============================================================================
// CLI
// ============================================================================

const HELP_TEXT = `
Sync Secrets Script

Syncs environment variables from Supabase, PostHog, and Vercel to Infisical.
For each service, you can select which project to sync FROM.

Usage:
  bun scripts/sync-secrets.ts [options]

Options:
  --services <list>           Comma-separated list of services to sync
                              Available: supabase,posthog,vercel
  --posthog-api-key <key>     PostHog personal API key (required for PostHog)
  --posthog-region <us|eu>    PostHog region (default: us)
  --infisical-org-id <id>     Use specific Infisical org (not needed with machine identity)
  --infisical-project-id <id> Use specific Infisical project (required with machine identity)
  --dry-run                   Preview changes without applying
  --no-interactive            Skip interactive prompts
  --verbose, -v               Show detailed output
  --help                      Show this help message

Environment Variables:
  INFISICAL_TOKEN             Machine identity token (skips org/project selection)

Examples:
  # Interactive mode - prompts for everything
  bun scripts/sync-secrets.ts

  # Sync only Supabase
  bun scripts/sync-secrets.ts --services supabase

  # Sync PostHog with API key
  bun scripts/sync-secrets.ts --services posthog --posthog-api-key phx_xxx

  # With machine identity token
  INFISICAL_TOKEN=xxx bun scripts/sync-secrets.ts --infisical-project-id <project-id> --services supabase
`;

interface CliOptions {
  services?: string;
  posthogApiKey?: string;
  posthogRegion: PostHogRegion;
  infisicalOrgId?: string;
  infisicalProjectId?: string;
  dryRun: boolean;
  noInteractive: boolean;
  verbose: boolean;
}

function parseCliOptions(): CliOptions {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      'dry-run': { default: false, type: 'boolean' },
      help: { default: false, type: 'boolean' },
      'infisical-org-id': { type: 'string' },
      'infisical-project-id': { type: 'string' },
      'no-interactive': { default: false, type: 'boolean' },
      'posthog-api-key': { type: 'string' },
      'posthog-region': { default: 'us', type: 'string' },
      services: { type: 'string' },
      verbose: { default: false, short: 'v', type: 'boolean' },
    },
  });

  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const posthogRegion = values['posthog-region'] as PostHogRegion;
  if (posthogRegion !== 'us' && posthogRegion !== 'eu') {
    p.log.error('--posthog-region must be "us" or "eu"');
    process.exit(1);
  }

  return {
    dryRun: values['dry-run'] ?? false,
    infisicalOrgId: values['infisical-org-id'],
    infisicalProjectId: values['infisical-project-id'],
    noInteractive: values['no-interactive'] ?? false,
    posthogApiKey: values['posthog-api-key'],
    posthogRegion,
    services: values.services,
    verbose: values.verbose ?? false,
  };
}

// ============================================================================
// Service Selection
// ============================================================================

async function promptForServices(
  servicesArg: string | undefined,
  noInteractive: boolean,
): Promise<SyncService[]> {
  if (servicesArg) {
    const requested = servicesArg.split(',').map((s) => s.trim().toLowerCase());
    const invalid = requested.filter(
      (s) => !SYNC_SERVICES.includes(s as SyncService),
    );
    if (invalid.length > 0) {
      p.log.error(`Invalid services: ${invalid.join(', ')}`);
      p.log.info(`Available services: ${SYNC_SERVICES.join(', ')}`);
      process.exit(1);
    }
    return requested as SyncService[];
  }

  if (noInteractive) {
    return [...SYNC_SERVICES];
  }

  const servicesInput = await p.multiselect({
    initialValues: [...SYNC_SERVICES],
    message: 'Which services would you like to sync?',
    options: SYNC_SERVICES.map((service) => ({
      hint: SERVICE_INFO[service].hint,
      label: SERVICE_INFO[service].label,
      value: service,
    })),
    required: true,
  });

  if (p.isCancel(servicesInput)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return servicesInput as SyncService[];
}

// ============================================================================
// PostHog API Key
// ============================================================================

async function getPostHogApiKey(
  providedKey: string | undefined,
  noInteractive: boolean,
  needsPostHog: boolean,
): Promise<string | undefined> {
  if (!needsPostHog) {
    return undefined;
  }

  if (providedKey) {
    return providedKey;
  }

  if (noInteractive) {
    throw new Error(
      '--posthog-api-key is required when syncing PostHog in non-interactive mode',
    );
  }

  const apiKey = await p.text({
    message: 'Enter your PostHog personal API key:',
    placeholder:
      'phx_xxx (create at https://us.posthog.com/settings/user-api-keys)',
    validate: (v: string) => {
      if (!v?.trim()) return 'PostHog API key is required';
      if (!v.startsWith('phx_'))
        return 'PostHog API key should start with "phx_"';
    },
  });

  if (p.isCancel(apiKey)) {
    throw new Error('Cancelled by user');
  }

  return apiKey as string;
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
  p.intro('🔄 Sync Secrets');

  if (options.verbose) p.log.info('Verbose mode enabled');
  if (options.dryRun) p.log.warn('DRY RUN MODE - No changes will be made');

  try {
    // Step 1: Authenticate with Infisical
    const infisicalToken = await withSpinner(
      'Authenticating with Infisical...',
      () => getInfisicalToken(),
      'Authenticated with Infisical',
    );

    // Step 2: Get target project ID
    let targetProjectId: string;
    let targetProjectName: string;

    if (options.infisicalProjectId) {
      // Use CLI-provided project ID
      targetProjectId = options.infisicalProjectId;
      targetProjectName = options.infisicalProjectId;
      p.log.success(`Using project from CLI: ${targetProjectId}`);
    } else {
      // Try to read from .infisical.json first
      try {
        const config = await readInfisicalConfig();
        if (config.workspaceId) {
          targetProjectId = config.workspaceId;
          targetProjectName = config.workspaceId;
          p.log.success(
            `Using project from .infisical.json: ${targetProjectId}`,
          );
        } else {
          throw new Error('No workspaceId in config');
        }
      } catch {
        // Fall back to org/project selection (requires org-level access)
        p.log.info('No project ID found, selecting from organization...');
        const infisicalOrg = await getOrSelectInfisicalOrg(
          infisicalToken,
          options.infisicalOrgId,
          options.noInteractive,
        );

        const targetProject = await selectInfisicalProject(
          infisicalToken,
          infisicalOrg.id,
          options.noInteractive,
        );

        targetProjectId = targetProject.id;
        targetProjectName = targetProject.name;
        p.log.success(`Target: ${targetProjectName} (${targetProjectId})`);
      }
    }

    // Step 3: Select services to sync
    const selectedServices = await promptForServices(
      options.services,
      options.noInteractive,
    );

    if (selectedServices.length === 0) {
      p.log.warn('No services selected');
      p.outro('Nothing to sync');
      return;
    }

    // Step 4: Get PostHog API key if needed
    const needsPostHog = selectedServices.includes('posthog');
    const posthogApiKey = await getPostHogApiKey(
      options.posthogApiKey,
      options.noInteractive,
      needsPostHog,
    );

    // Step 5: Sync each service
    const results = await syncSecretsToInfisical({
      dryRun: options.dryRun,
      noInteractive: options.noInteractive,
      posthogApiKey,
      posthogRegion: options.posthogRegion,
      services: selectedServices,
      targetProjectId,
    });

    // Done!
    p.outro('✨ Sync complete!');

    // Show summary
    showSyncSummary(results, options.dryRun);

    // Show link to Infisical project
    if (!options.dryRun && results.length > 0) {
      p.note(
        `https://app.infisical.com/project/${targetProjectId}/secrets/overview`,
        '🔐 View in Infisical',
      );
    }

    console.log('');
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
