#!/usr/bin/env bun
/**
 * Clone Project Script
 *
 * Creates new Infisical, Supabase, PostHog, and Vercel projects, then clones all
 * Infisical secrets from an existing project to a new one.
 *
 * Usage:
 *   bun scripts/clone-project.ts --project-name <name>
 */

import { parseArgs } from 'node:util';

import { buildLocalDevOverrides, buildSupabaseCredentials } from './builders';
import {
  readInfisicalConfig,
  readSupabaseConfig,
  sanitizeSchemaName,
  updateInfisicalConfig,
  updateProjectConfigs,
} from './config';
import {
  createRepoFromTemplate,
  getGitHubToken,
  getOrSelectGitHubOwner,
  hasGitRemote,
  isInGitRepo,
} from './github';
import {
  createInfisicalProject,
  exportInfisicalSecrets,
  getInfisicalToken,
  getOrSelectInfisicalOrg,
  importInfisicalSecrets,
  loadAndValidateSecrets,
  logMissingSecrets,
  selectInfisicalProject,
} from './infisical';
import {
  createVercelSync,
  listVercelConnections,
  mapToVercelEnv,
} from './infisical-sync';
import {
  createPostHogProject,
  getOrCreatePostHogOrg,
  getPostHogApiUrl,
  getPostHogHost,
} from './posthog';
import {
  createSupabaseProject,
  getOrSelectSupabaseOrg,
  getSupabaseApiKeys,
  waitForProjectReady,
} from './supabase';
import { promptForSecretSelection } from './sync';
import {
  ENVIRONMENTS,
  type Environment,
  type PostHogRegion,
  type SecretInfo,
  type SupabaseApiKey,
} from './types';
import {
  generateSecurePassword,
  isVerbose,
  p,
  setVerbose,
  withSpinner,
} from './utils';
import {
  createVercelProject,
  getGitRepoFromRemote,
  getOrSelectVercelTeam,
} from './vercel';

// ============================================================================
// Types
// ============================================================================

const ALL_SERVICES = [
  'infisical',
  'supabase',
  'posthog',
  'vercel',
  'github',
] as const;
type Service = (typeof ALL_SERVICES)[number];

interface CliOptions {
  projectName?: string;
  supabaseRegion: string;
  supabaseOrgId?: string;
  infisicalOrgId?: string;
  posthogOrgId?: string;
  posthogOrgName?: string;
  posthogRegion: PostHogRegion;
  vercelTeamId?: string;
  vercelTeamSlug?: string;
  dryRun: boolean;
  noInteractive: boolean;
  verbose: boolean;
  services?: string;
}

interface SetupResult {
  gitRepo?: string;
  sourceProjectId?: string;
  posthogPersonalApiKey?: string;
  vercelToken?: string;
  infisicalToken?: string;
  infisicalOrgId?: string;
}

interface CreatedResources {
  infisicalProjectId?: string;
  supabaseProjectRef?: string;
  supabaseApiKeys: SupabaseApiKey[];
  posthogApiKey?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
  dbPassword: string;
  betterAuthSecret: string;
}

// ============================================================================
// CLI
// ============================================================================

const HELP_TEXT = `
Clone Project Script

Creates new Infisical, Supabase, PostHog, and Vercel projects and clones secrets.

If run from outside a git repository:
  - Creates a new GitHub repo from seawatts/startup-template
  - Prompts to select an Infisical project to copy secrets from

If run from within a git repository:
  - Uses the existing .infisical.json configuration
  - Creates new projects and clones secrets

Prerequisites:
  - Run 'infisical login' to authenticate with Infisical
  - Run 'gh auth login' to authenticate with GitHub (if creating new repo)
  - Source project must have POSTHOG_PERSONAL_API_KEY and VERCEL_TOKEN secrets

Usage:
  bun scripts/clone-project.ts [--project-name <name>]

Options:
  --project-name <name>       Name for all new projects (will prompt if not provided)
  --services <list>           Comma-separated list of services to create
                              Available: infisical,supabase,posthog,vercel,github
  --supabase-region <region>  Supabase region (default: us-west-1)
  --infisical-org-id <id>     Use specific Infisical org
  --supabase-org-id <id>      Use existing Supabase org
  --posthog-org-id <id>       Use existing PostHog org
  --posthog-org-name <name>   Name for new PostHog org
  --posthog-region <us|eu>    PostHog region (default: us)
  --vercel-team-id <id>       Vercel team ID
  --vercel-team-slug <slug>   Vercel team slug
  --dry-run                   Preview changes without applying
  --no-interactive            Skip interactive prompts
  --verbose, -v               Show detailed output
  --help                      Show this help message
`;

function parseCliOptions(): CliOptions {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      'dry-run': { default: false, type: 'boolean' },
      help: { default: false, type: 'boolean' },
      'infisical-org-id': { type: 'string' },
      'no-interactive': { default: false, type: 'boolean' },
      'posthog-org-id': { type: 'string' },
      'posthog-org-name': { type: 'string' },
      'posthog-region': { type: 'string' },
      'project-name': { type: 'string' },
      services: { type: 'string' },
      'supabase-org-id': { type: 'string' },
      'supabase-region': { default: 'us-west-1', type: 'string' },
      verbose: { default: false, short: 'v', type: 'boolean' },
      'vercel-team-id': { type: 'string' },
      'vercel-team-slug': { type: 'string' },
    },
  });

  if (values.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const posthogRegion = (values['posthog-region'] || 'us') as PostHogRegion;
  if (posthogRegion !== 'us' && posthogRegion !== 'eu') {
    p.log.error('--posthog-region must be "us" or "eu"');
    process.exit(1);
  }

  return {
    dryRun: values['dry-run'] ?? false,
    infisicalOrgId: values['infisical-org-id'],
    noInteractive: values['no-interactive'] ?? false,
    posthogOrgId: values['posthog-org-id'],
    posthogOrgName: values['posthog-org-name'],
    posthogRegion,
    projectName: values['project-name'],
    services: values.services,
    supabaseOrgId: values['supabase-org-id'],
    supabaseRegion: values['supabase-region'] as string,
    verbose: values.verbose ?? false,
    vercelTeamId: values['vercel-team-id'],
    vercelTeamSlug: values['vercel-team-slug'],
  };
}

async function promptForProjectName(noInteractive: boolean): Promise<string> {
  if (noInteractive) {
    p.log.error('--project-name is required when using --no-interactive');
    process.exit(1);
  }

  const nameInput = await p.text({
    message: 'What would you like to name your project?',
    placeholder: 'my-awesome-project',
    validate: (value) => {
      if (!value?.trim()) return 'Project name is required';
      if (!/^[\w-]+$/.test(value)) {
        return 'Project name can only contain letters, numbers, underscores, and hyphens';
      }
    },
  });

  if (p.isCancel(nameInput)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return nameInput as string;
}

async function promptForServices(
  servicesArg: string | undefined,
  noInteractive: boolean,
): Promise<Service[]> {
  if (servicesArg) {
    const requested = servicesArg.split(',').map((s) => s.trim().toLowerCase());
    const invalid = requested.filter(
      (s) => !ALL_SERVICES.includes(s as Service),
    );
    if (invalid.length > 0) {
      p.log.error(`Invalid services: ${invalid.join(', ')}`);
      p.log.info(`Available services: ${ALL_SERVICES.join(', ')}`);
      process.exit(1);
    }
    return requested as Service[];
  }

  if (noInteractive) {
    return [...ALL_SERVICES];
  }

  const servicesInput = await p.multiselect({
    initialValues: [...ALL_SERVICES],
    message: 'Which services would you like to set up?',
    options: [
      {
        hint: 'Secret management & environment variables',
        label: 'Infisical',
        value: 'infisical',
      },
      {
        hint: 'Database & authentication',
        label: 'Supabase',
        value: 'supabase',
      },
      { hint: 'Product analytics', label: 'PostHog', value: 'posthog' },
      { hint: 'Deployment & hosting', label: 'Vercel', value: 'vercel' },
      {
        hint: 'Create new repo from template',
        label: 'GitHub',
        value: 'github',
      },
    ],
    required: true,
  });

  if (p.isCancel(servicesInput)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return servicesInput as Service[];
}

// ============================================================================
// Initial Setup (Git + Source Secrets)
// ============================================================================

const REQUIRED_SECRETS = {
  posthog: {
    helpUrl: 'https://us.posthog.com/settings/user-api-keys',
    key: 'POSTHOG_PERSONAL_API_KEY',
  },
  vercel: { helpUrl: 'https://vercel.com/account/tokens', key: 'VERCEL_TOKEN' },
};

async function setupFromNewRepo(
  projectName: string,
  options: CliOptions,
  selectedServices: Service[],
): Promise<SetupResult> {
  const shouldCreate = (s: Service) => selectedServices.includes(s);

  p.log.info('No git repository detected. Creating from template...');

  if (options.noInteractive) {
    p.log.error(
      'Cannot create repository in --no-interactive mode. Please run from within an existing git repo.',
    );
    process.exit(1);
  }

  // Authenticate with GitHub
  const githubToken = await withSpinner(
    'Authenticating with GitHub...',
    async () => {
      try {
        return await getGitHubToken();
      } catch {
        throw new Error(
          'Please run "gh auth login" or set GITHUB_TOKEN environment variable',
        );
      }
    },
    'Authenticated with GitHub',
  );

  // Authenticate with Infisical and select source project
  const infisicalToken = await withSpinner(
    'Authenticating with Infisical...',
    () => getInfisicalToken(),
    'Authenticated with Infisical',
  );

  const infisicalOrg = await getOrSelectInfisicalOrg(
    infisicalToken,
    options.infisicalOrgId,
    options.noInteractive,
  );
  const sourceProject = await selectInfisicalProject(
    infisicalToken,
    infisicalOrg.id,
    options.noInteractive,
  );

  // Load secrets from source project
  let posthogPersonalApiKey: string | undefined;
  let vercelToken: string | undefined;

  if (shouldCreate('posthog') || shouldCreate('vercel')) {
    const requiredSecrets = [
      ...(shouldCreate('posthog') ? [REQUIRED_SECRETS.posthog] : []),
      ...(shouldCreate('vercel') ? [REQUIRED_SECRETS.vercel] : []),
    ];

    const { secrets, missing } = await withSpinner(
      'Loading configuration from source project...',
      () =>
        loadAndValidateSecrets({
          projectId: sourceProject.id,
          required: requiredSecrets,
        }),
      'Configuration loaded from source project',
    );

    if (missing.length > 0) {
      logMissingSecrets(requiredSecrets.filter((s) => missing.includes(s.key)));
      process.exit(1);
    }

    posthogPersonalApiKey = secrets.POSTHOG_PERSONAL_API_KEY;
    vercelToken = secrets.VERCEL_TOKEN;
  }

  // Create GitHub repo
  const githubOwner = await getOrSelectGitHubOwner(
    githubToken,
    options.noInteractive,
  );
  let gitRepo: string;

  if (options.dryRun) {
    p.log.info(
      `Would create GitHub repo: ${githubOwner}/${projectName} from seawatts/startup-template`,
    );
    gitRepo = `${githubOwner}/${projectName}`;
  } else {
    const newRepo = await withSpinner(
      'Creating GitHub repository from template...',
      () => createRepoFromTemplate(githubToken, projectName, githubOwner, true),
      'Created GitHub repository',
    );
    gitRepo = newRepo.full_name;
    p.log.info('Clone your new repo with:');
    p.log.info(`  git clone ${newRepo.ssh_url}`);
    p.log.info(`  cd ${projectName}`);
  }

  return {
    gitRepo,
    infisicalOrgId: infisicalOrg.id,
    infisicalToken,
    posthogPersonalApiKey,
    sourceProjectId: sourceProject.id,
    vercelToken,
  };
}

async function setupFromExistingRepo(
  _options: CliOptions,
  selectedServices: Service[],
): Promise<SetupResult> {
  const shouldCreate = (s: Service) => selectedServices.includes(s);

  const infisicalConfig = await withSpinner(
    'Loading configuration from Infisical...',
    async () => {
      const config = await readInfisicalConfig();
      return config;
    },
    'Configuration loaded from Infisical',
  );

  const sourceProjectId = infisicalConfig.workspaceId;
  let posthogPersonalApiKey: string | undefined;
  let vercelToken: string | undefined;

  // Load secrets only if needed
  if (shouldCreate('posthog') || shouldCreate('vercel')) {
    const requiredSecrets = [
      ...(shouldCreate('posthog') ? [REQUIRED_SECRETS.posthog] : []),
      ...(shouldCreate('vercel') ? [REQUIRED_SECRETS.vercel] : []),
    ];

    const { secrets, missing } = await loadAndValidateSecrets({
      projectId: sourceProjectId,
      required: requiredSecrets,
    });

    if (missing.length > 0) {
      logMissingSecrets(requiredSecrets.filter((s) => missing.includes(s.key)));
      process.exit(1);
    }

    posthogPersonalApiKey = secrets.POSTHOG_PERSONAL_API_KEY;
    vercelToken = secrets.VERCEL_TOKEN;
  }

  const gitRepo = await getGitRepoFromRemote();

  return { gitRepo, posthogPersonalApiKey, sourceProjectId, vercelToken };
}

// ============================================================================
// Service Creation
// ============================================================================

async function createInfisicalResources(
  projectName: string,
  options: CliOptions,
): Promise<{ projectId: string; token: string; orgId: string }> {
  if (options.dryRun) {
    p.log.info(`Would create Infisical project: ${projectName}`);
    return {
      orgId: 'dry-run-org-id',
      projectId: 'dry-run-infisical-project-id',
      token: '',
    };
  }

  return withSpinner(
    'Creating Infisical project...',
    async () => {
      const token = await getInfisicalToken();
      const org = await getOrSelectInfisicalOrg(
        token,
        options.infisicalOrgId,
        options.noInteractive,
      );
      const project = await createInfisicalProject(token, org.id, projectName);
      return { orgId: org.id, projectId: project.id, token };
    },
    `Created Infisical project: ${projectName}`,
  );
}

async function createSupabaseResources(
  projectName: string,
  dbPassword: string,
  options: CliOptions,
): Promise<{ projectRef: string; apiKeys: SupabaseApiKey[] }> {
  const supabaseOrg = await getOrSelectSupabaseOrg(
    options.supabaseOrgId,
    projectName,
    options.noInteractive,
    options.dryRun,
  );

  if (options.dryRun) {
    p.log.info(`Would create Supabase project: ${projectName}`);
    p.log.info(`  Region: ${options.supabaseRegion}`);
    return {
      apiKeys: [
        { api_key: 'dry-run-anon-key', name: 'anon' },
        { api_key: 'dry-run-service-role-key', name: 'service_role' },
      ],
      projectRef: 'dry-run-project-ref',
    };
  }

  const project = await withSpinner(
    'Creating Supabase project...',
    async (update) => {
      const proj = await createSupabaseProject(
        projectName,
        supabaseOrg.id,
        dbPassword,
        options.supabaseRegion,
      );
      update('Waiting for Supabase project to be ready...');
      await waitForProjectReady(proj.id);
      return proj;
    },
    `Created Supabase project: ${projectName}`,
  );

  const apiKeys = await withSpinner(
    'Fetching Supabase API keys...',
    () => getSupabaseApiKeys(project.id),
    'Retrieved Supabase API keys',
  );

  return { apiKeys, projectRef: project.id };
}

async function createPostHogResources(
  projectName: string,
  apiKey: string,
  options: CliOptions,
): Promise<string> {
  if (options.dryRun) {
    p.log.info(`Would create PostHog project: ${projectName}`);
    return 'dry-run-posthog-api-key';
  }

  return withSpinner(
    'Creating PostHog project...',
    async () => {
      const org = await getOrCreatePostHogOrg({
        dryRun: options.dryRun,
        noInteractive: options.noInteractive,
        orgName: options.posthogOrgName,
        personalApiKey: apiKey,
        providedOrgId: options.posthogOrgId,
        region: options.posthogRegion,
      });
      const project = await createPostHogProject(
        apiKey,
        options.posthogRegion,
        org.id,
        projectName,
      );
      return project.api_token;
    },
    `Created PostHog project: ${projectName}`,
  );
}

async function createVercelResources(
  projectName: string,
  gitRepo: string,
  vercelToken: string,
  options: CliOptions,
): Promise<{ projectId: string; teamId?: string }> {
  if (options.dryRun) {
    p.log.info(`Would create Vercel project: ${projectName}`);
    return { projectId: 'dry-run-vercel-project-id' };
  }

  return withSpinner(
    'Creating Vercel project...',
    async () => {
      const teamId = await getOrSelectVercelTeam({
        noInteractive: options.noInteractive,
        providedTeamId: options.vercelTeamId,
        providedTeamSlug: options.vercelTeamSlug,
        token: vercelToken,
      });
      const project = await createVercelProject({
        gitRepo,
        projectName,
        teamId,
        token: vercelToken,
      });
      return { projectId: project.id, teamId };
    },
    `Created Vercel project: ${projectName}`,
  );
}

// ============================================================================
// Secret Cloning
// ============================================================================

async function cloneSecrets(
  sourceProjectId: string,
  targetProjectId: string,
  projectName: string,
  resources: CreatedResources,
  options: CliOptions,
): Promise<void> {
  // Read Supabase config for local ports
  let apiPort = 54321;
  let dbPort = 54322;
  try {
    const supabaseConfig = await readSupabaseConfig();
    apiPort = supabaseConfig.api.port;
    dbPort = supabaseConfig.db.port;
  } catch {
    // Use defaults
  }

  const posthogHost = getPostHogHost(options.posthogRegion);

  // Build overrides
  const localDevOverrides = buildLocalDevOverrides(
    apiPort,
    dbPort,
    resources.betterAuthSecret,
    resources.posthogApiKey || '',
    posthogHost,
  );

  const supabaseCreds = resources.supabaseProjectRef
    ? buildSupabaseCredentials(
        resources.supabaseProjectRef,
        options.supabaseRegion,
        resources.dbPassword,
        resources.supabaseApiKeys,
        resources.betterAuthSecret,
        resources.posthogApiKey || '',
        posthogHost,
      )
    : {};

  // Export secrets from source project
  const secretsByEnv: Record<Environment, Record<string, string>> = {
    dev: {},
    prod: {},
    staging: {},
  };

  await withSpinner(
    'Fetching secrets from source project...',
    async () => {
      for (const env of ENVIRONMENTS) {
        const secrets = await exportInfisicalSecrets(sourceProjectId, env);
        secretsByEnv[env] = Object.fromEntries(
          secrets.map((s) => [s.key, s.value]),
        );
      }

      // Apply overrides
      Object.assign(secretsByEnv.dev, localDevOverrides);
      if (resources.supabaseProjectRef) {
        Object.assign(secretsByEnv.staging, supabaseCreds);
        Object.assign(secretsByEnv.prod, supabaseCreds);
      }
    },
    'Fetched secrets from source project',
  );

  // Build list of all secrets for selection
  const allSecrets: SecretInfo[] = [];
  const seenKeys = new Set<string>();

  // Add secrets from all environments
  for (const env of ENVIRONMENTS) {
    for (const [key, value] of Object.entries(secretsByEnv[env])) {
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allSecrets.push({
          hasValue: !!value,
          key,
          service: 'supabase', // Generic - these are from Infisical
          value,
        });
      }
    }
  }

  // Sort alphabetically
  allSecrets.sort((a, b) => a.key.localeCompare(b.key));

  // Prompt for secret selection
  const selectedKeys = await promptForSecretSelection(
    allSecrets,
    options.noInteractive,
  );

  if (selectedKeys.length === 0) {
    p.log.warn('No secrets selected to clone');
    return;
  }

  p.log.success(`Selected ${selectedKeys.length} secrets to clone`);

  // Filter secrets to only selected ones
  const selectedKeySet = new Set(selectedKeys);
  for (const env of ENVIRONMENTS) {
    secretsByEnv[env] = Object.fromEntries(
      Object.entries(secretsByEnv[env]).filter(([key]) =>
        selectedKeySet.has(key),
      ),
    );
  }

  // Import to target project
  if (options.dryRun) {
    p.log.info('Dry run - would import:');
    for (const env of ENVIRONMENTS) {
      const keys = Object.keys(secretsByEnv[env]);
      p.log.info(`  ${env}: ${keys.length} secrets`);
    }
  } else {
    await withSpinner(
      'Importing secrets to target project...',
      async (update) => {
        for (const env of ENVIRONMENTS) {
          update(`Importing secrets to ${env}...`);
          await importInfisicalSecrets(targetProjectId, env, secretsByEnv[env]);
        }
      },
      'Cloned secrets to new project',
    );
  }

  // Update .infisical.json
  if (options.dryRun) {
    p.log.info(`Would update .infisical.json to: ${targetProjectId}`);
  } else {
    await updateInfisicalConfig(targetProjectId);
    p.log.success('Updated .infisical.json');
  }

  // Update supabase config.toml, drizzle schema, and drizzle config with project name
  const dbSchemaName = sanitizeSchemaName(projectName);
  if (options.dryRun) {
    p.log.info(
      `Would update supabase config.toml project_id to: ${projectName}`,
    );
    p.log.info(
      `Would update drizzle schema to use PostgreSQL schema: ${dbSchemaName}`,
    );
    p.log.info(
      `Would update drizzle.config.ts to use PostgreSQL schema: ${dbSchemaName}`,
    );
  } else {
    await updateProjectConfigs(projectName);
    p.log.success(`Updated supabase config.toml (project_id: ${projectName})`);
    p.log.success(
      `Updated drizzle schema (PostgreSQL schema: ${dbSchemaName})`,
    );
    p.log.success(
      `Updated drizzle.config.ts (PostgreSQL schema: ${dbSchemaName})`,
    );
  }
}

async function setupVercelSync(
  infisicalToken: string,
  infisicalOrgId: string,
  infisicalProjectId: string,
  vercelProjectId: string,
  vercelTeamId: string | undefined,
  projectName: string,
): Promise<boolean> {
  return withSpinner(
    'Setting up Infisical → Vercel sync...',
    async () => {
      const connections = await listVercelConnections(
        infisicalToken,
        infisicalOrgId,
      );

      if (connections.length === 0) {
        return false;
      }

      const connection = connections[0];
      for (const env of ENVIRONMENTS) {
        await createVercelSync(infisicalToken, {
          connectionId: connection.id,
          environment: env,
          name: `${projectName}-${env}-sync`,
          projectId: infisicalProjectId,
          secretPath: '/',
          vercelEnv: mapToVercelEnv(env),
          vercelProjectId,
          vercelProjectName: projectName,
          vercelTeamId,
        });
      }

      return true;
    },
    'Configured Infisical → Vercel sync',
  ).catch((error) => {
    if (isVerbose()) {
      p.log.warn(
        `Sync setup error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return false;
  });
}

// ============================================================================
// Summary Output
// ============================================================================

function showSummary(
  selectedServices: Service[],
  resources: CreatedResources,
  setup: SetupResult,
  options: CliOptions,
  vercelSyncSetup: boolean,
): void {
  const shouldCreate = (s: Service) => selectedServices.includes(s);

  // Build URLs
  const vercelTeamPath = resources.vercelTeamId
    ? `team_${resources.vercelTeamId}`
    : '';
  const vercelProjectUrl = vercelTeamPath
    ? `https://vercel.com/${vercelTeamPath}/${options.projectName}`
    : `https://vercel.com/~/projects/${options.projectName}`;
  const githubUrl = setup.gitRepo
    ? `https://github.com/${setup.gitRepo}`
    : undefined;

  // Build project links
  const projectLinks: string[] = [];

  if (options.dryRun) {
    projectLinks.push('(Dry run - no projects created)');
  } else {
    if (shouldCreate('infisical') && resources.infisicalProjectId) {
      projectLinks.push(
        `🔐 Infisical\n   https://app.infisical.com/project/${resources.infisicalProjectId}/secrets/overview`,
      );
    }
    if (shouldCreate('supabase') && resources.supabaseProjectRef) {
      projectLinks.push(
        `🗄️  Supabase\n   https://supabase.com/dashboard/project/${resources.supabaseProjectRef}`,
      );
    }
    if (shouldCreate('posthog')) {
      projectLinks.push(
        `📊 PostHog\n   ${getPostHogApiUrl(options.posthogRegion)}/project/`,
      );
    }
    if (shouldCreate('vercel') && resources.vercelProjectId) {
      projectLinks.push(`▲  Vercel\n   ${vercelProjectUrl}`);
    }
    if (githubUrl) {
      projectLinks.push(`🐙 GitHub\n   ${githubUrl}`);
    }
  }

  if (projectLinks.length > 0) {
    p.note(projectLinks.join('\n\n'), '📦 Created Projects');
  }

  // Credentials note
  if (shouldCreate('infisical')) {
    const credentials: string[] = [];
    if (shouldCreate('supabase')) credentials.push('• POSTGRES_PASSWORD');
    credentials.push('• BETTER_AUTH_SECRET');
    if (shouldCreate('posthog')) {
      credentials.push('• POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_KEY');
      credentials.push('• POSTHOG_HOST / NEXT_PUBLIC_POSTHOG_HOST');
    }
    p.note(credentials.join('\n'), '🔐 Credentials stored in Infisical');
  }

  // Vercel sync status
  if (vercelSyncSetup) {
    p.note(
      'Secrets will automatically sync to Vercel when changed in Infisical.',
      '✅ Infisical → Vercel sync configured',
    );
  } else if (
    !options.dryRun &&
    shouldCreate('infisical') &&
    shouldCreate('vercel') &&
    setup.infisicalOrgId
  ) {
    p.note(
      `1. Set up Vercel Connection in Infisical:\n   https://app.infisical.com/org/${setup.infisicalOrgId}/app-connections\n   Docs: https://infisical.com/docs/integrations/secret-syncs/vercel\n2. Re-run this script or manually create syncs\n3. Deploy your project to Vercel`,
      '⚠️  Next steps',
    );
  }
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
  p.intro('🚀 Clone Project');

  if (options.verbose) p.log.info('Verbose mode enabled');
  if (options.dryRun) p.log.warn('DRY RUN MODE - No changes will be made');

  // Get project name
  const projectName =
    options.projectName ?? (await promptForProjectName(options.noInteractive));
  options.projectName = projectName;

  // Get services to create
  const selectedServices = await promptForServices(
    options.services,
    options.noInteractive,
  );
  const shouldCreate = (s: Service) => selectedServices.includes(s);

  try {
    // Initial setup (GitHub + source secrets)
    const inGitRepo = await isInGitRepo();
    const hasRemote = inGitRepo && (await hasGitRemote());

    let setup: SetupResult;
    if (!hasRemote && shouldCreate('github')) {
      setup = await setupFromNewRepo(projectName, options, selectedServices);
    } else if (hasRemote) {
      setup = await setupFromExistingRepo(options, selectedServices);
    } else {
      p.log.warn('Not in a git repository. Some features may not work.');
      setup = {};
    }

    // Generate credentials
    const dbPassword = shouldCreate('supabase')
      ? generateSecurePassword(32)
      : '';
    const betterAuthSecret = generateSecurePassword(64);
    if (shouldCreate('supabase')) {
      p.log.success('Generated secure credentials');
    }

    // Initialize resources
    const resources: CreatedResources = {
      betterAuthSecret,
      dbPassword,
      supabaseApiKeys: [],
    };

    // Create Infisical project
    if (shouldCreate('infisical')) {
      const infisical = await createInfisicalResources(projectName, options);
      resources.infisicalProjectId = infisical.projectId;
      setup.infisicalToken = infisical.token;
      setup.infisicalOrgId = infisical.orgId;
    } else {
      p.log.step('Skipping Infisical');
    }

    // Create Supabase project
    if (shouldCreate('supabase')) {
      const supabase = await createSupabaseResources(
        projectName,
        dbPassword,
        options,
      );
      resources.supabaseProjectRef = supabase.projectRef;
      resources.supabaseApiKeys = supabase.apiKeys;
    } else {
      p.log.step('Skipping Supabase');
    }

    // Create PostHog project
    if (shouldCreate('posthog') && setup.posthogPersonalApiKey) {
      resources.posthogApiKey = await createPostHogResources(
        projectName,
        setup.posthogPersonalApiKey,
        options,
      );
    } else if (shouldCreate('posthog')) {
      p.log.step('Skipping PostHog (no API key)');
    } else {
      p.log.step('Skipping PostHog');
    }

    // Create Vercel project
    if (shouldCreate('vercel') && setup.gitRepo && setup.vercelToken) {
      const vercel = await createVercelResources(
        projectName,
        setup.gitRepo,
        setup.vercelToken,
        options,
      );
      resources.vercelProjectId = vercel.projectId;
      resources.vercelTeamId = vercel.teamId;
    } else if (shouldCreate('vercel')) {
      p.log.step('Skipping Vercel (no git repo or token)');
    } else {
      p.log.step('Skipping Vercel');
    }

    // Clone secrets
    let vercelSyncSetup = false;
    if (
      shouldCreate('infisical') &&
      resources.infisicalProjectId &&
      setup.sourceProjectId
    ) {
      await cloneSecrets(
        setup.sourceProjectId,
        resources.infisicalProjectId,
        projectName,
        resources,
        options,
      );

      // Setup Vercel sync
      if (
        shouldCreate('vercel') &&
        !options.dryRun &&
        setup.infisicalToken &&
        setup.infisicalOrgId &&
        resources.vercelProjectId
      ) {
        vercelSyncSetup = await setupVercelSync(
          setup.infisicalToken,
          setup.infisicalOrgId,
          resources.infisicalProjectId,
          resources.vercelProjectId,
          resources.vercelTeamId,
          projectName,
        );
      }
    }

    // Done!
    p.outro('✨ Project cloned successfully!');
    showSummary(selectedServices, resources, setup, options, vercelSyncSetup);
    console.log('');
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
