import type {
  Environment,
  InfisicalOrg,
  InfisicalWorkspace,
  Secret,
} from './types';
import { apiFetch, p, runCommand, selectOrCreate } from './utils';

const INFISICAL_API_URL = 'https://app.infisical.com/api';

// ============================================================================
// Project Management
// ============================================================================

/**
 * List all workspaces/projects in an organization
 */
export async function listInfisicalProjects(
  token: string,
  orgId: string,
): Promise<InfisicalWorkspace[]> {
  const data = await apiFetch<{ workspaces: InfisicalWorkspace[] }>(
    `${INFISICAL_API_URL}/v1/workspace?organizationId=${orgId}`,
    token,
  );
  return data.workspaces;
}

/**
 * Select an Infisical project to copy from
 */
export async function selectInfisicalProject(
  token: string,
  orgId: string,
  noInteractive?: boolean,
): Promise<InfisicalWorkspace> {
  const projects = await listInfisicalProjects(token, orgId);

  if (projects.length === 0) {
    throw new Error('No Infisical projects found in this organization');
  }

  return selectOrCreate({
    autoSelectMessage: (proj) => `Using Infisical project: ${proj.name}`,
    items: projects,
    mapOption: (proj) => ({ label: proj.name, value: proj.id }),
    message: 'Select an Infisical project to copy secrets from:',
    noInteractive,
  }) as Promise<InfisicalWorkspace>;
}

/**
 * Loads environment variables from Infisical using the CLI.
 * Returns the secrets as a key-value object.
 */
export async function loadInfisicalEnv(
  projectId: string,
  env: Environment = 'dev',
): Promise<Record<string, string>> {
  const { stdout, exitCode } = await runCommand(
    [
      'infisical',
      'export',
      `--env=${env}`,
      `--projectId=${projectId}`,
      '--format=json',
      '--silent',
    ],
    { silent: true },
  );

  if (exitCode !== 0) {
    throw new Error(
      `Failed to load environment from Infisical. Make sure you're logged in with 'infisical login'.`,
    );
  }

  const secrets = JSON.parse(stdout) as Secret[];
  return Object.fromEntries(secrets.map((s) => [s.key, s.value]));
}

/**
 * Gets a specific secret value from Infisical.
 * Returns undefined if the secret doesn't exist.
 */
export async function getInfisicalSecret(
  projectId: string,
  secretName: string,
  env: Environment = 'dev',
): Promise<string | undefined> {
  const secrets = await loadInfisicalEnv(projectId, env);
  return secrets[secretName];
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Get access token using Universal Auth (Client ID + Client Secret)
 */
async function getUniversalAuthToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch(
    `${INFISICAL_API_URL}/v1/auth/universal-auth/login`,
    {
      body: JSON.stringify({
        clientId,
        clientSecret,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Universal Auth login failed: ${error}`);
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

export async function getInfisicalToken(): Promise<string> {
  // Option 1: Universal Auth (Client ID + Client Secret)
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return getUniversalAuthToken(clientId, clientSecret);
  }

  // Option 2: Direct access token (Token Auth)
  const envToken = process.env.INFISICAL_TOKEN;
  if (envToken) {
    return envToken;
  }

  // Option 3: Fall back to CLI (user login)
  const { stdout, exitCode } = await runCommand(
    ['infisical', 'token', '--silent'],
    { silent: true },
  );

  if (exitCode !== 0 || !stdout.trim()) {
    throw new Error(
      'Failed to get Infisical token. Options:\n' +
        '  1. Run "infisical login"\n' +
        '  2. Set INFISICAL_TOKEN (Token Auth access token)\n' +
        '  3. Set INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET (Universal Auth)',
    );
  }

  return stdout.trim();
}

// ============================================================================
// Organization Management
// ============================================================================

export async function listInfisicalOrgs(
  token: string,
): Promise<InfisicalOrg[]> {
  const data = await apiFetch<{ organizations: InfisicalOrg[] }>(
    `${INFISICAL_API_URL}/v1/organization`,
    token,
  );
  return data.organizations;
}

export async function createInfisicalProject(
  token: string,
  orgId: string,
  projectName: string,
): Promise<InfisicalWorkspace> {
  const data = await apiFetch<{ workspace: InfisicalWorkspace }>(
    `${INFISICAL_API_URL}/v2/workspace`,
    token,
    {
      body: { organizationId: orgId, projectName },
      method: 'POST',
    },
  );
  return data.workspace;
}

export async function getOrSelectInfisicalOrg(
  token: string,
  providedOrgId?: string,
  noInteractive?: boolean,
): Promise<InfisicalOrg> {
  const orgs = await listInfisicalOrgs(token);

  if (orgs.length === 0) {
    throw new Error('No Infisical organizations found');
  }

  return selectOrCreate({
    autoSelectMessage: (org) => `Using Infisical org: ${org.name}`,
    findById: (items, id) => items.find((o) => o.id === id),
    items: orgs,
    mapOption: (org) => ({ label: `${org.name} (${org.slug})`, value: org.id }),
    message: 'Select an Infisical organization:',
    noInteractive,
    providedId: providedOrgId,
  }) as Promise<InfisicalOrg>;
}

export async function exportInfisicalSecrets(
  projectId: string,
  env: Environment,
): Promise<Secret[]> {
  const { stdout, exitCode } = await runCommand([
    'infisical',
    'export',
    `--env=${env}`,
    `--projectId=${projectId}`,
    '--format=json',
    '--silent',
  ]);

  if (exitCode !== 0) {
    throw new Error(`Failed to export secrets for ${env} environment`);
  }

  return JSON.parse(stdout) as Secret[];
}

export async function importInfisicalSecrets(
  projectId: string,
  env: Environment,
  secrets: Record<string, string>,
): Promise<void> {
  const entries = Object.entries(secrets);
  const batchSize = 10;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const secretArgs = batch.map(([key, value]) => `${key}=${value}`);

    const { exitCode, stderr } = await runCommand([
      'infisical',
      'secrets',
      'set',
      `--env=${env}`,
      `--projectId=${projectId}`,
      ...secretArgs,
    ]);

    if (exitCode !== 0) {
      throw new Error(
        `Failed to import secrets for ${env} environment: ${stderr}`,
      );
    }
  }
}

// ============================================================================
// Secret Validation
// ============================================================================

export interface RequiredSecretsConfig {
  projectId: string;
  env?: Environment;
  required: Array<{
    key: string;
    helpUrl?: string;
    helpText?: string;
  }>;
}

export interface LoadedSecrets {
  secrets: Record<string, string>;
  missing: string[];
}

/**
 * Load secrets from Infisical and check for required keys.
 * Returns the secrets and a list of any missing required keys.
 */
export async function loadAndValidateSecrets(
  config: RequiredSecretsConfig,
): Promise<LoadedSecrets> {
  const { projectId, env = 'dev', required } = config;

  const secrets = await loadInfisicalEnv(projectId, env);

  const missing = required
    .filter(({ key }) => !secrets[key])
    .map(({ key }) => key);

  return { missing, secrets };
}

/**
 * Log helpful messages for missing secrets
 */
export function logMissingSecrets(
  missing: Array<{ key: string; helpUrl?: string; helpText?: string }>,
): void {
  for (const { key, helpUrl, helpText } of missing) {
    p.log.error(
      `${key} not found in source Infisical project (dev environment).`,
    );
    if (helpUrl) {
      p.log.info(`Create one at: ${helpUrl}`);
    }
    if (helpText) {
      p.log.info(helpText);
    }
  }
  p.log.info('Then add it to your Infisical project.');
}
