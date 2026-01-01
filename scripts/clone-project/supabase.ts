import type { SupabaseApiKey, SupabaseOrg, SupabaseProject } from './types';
import { p, runCommand, sleep, withSpinner } from './utils';

// ============================================================================
// Organization Management
// ============================================================================

export async function listSupabaseOrgs(): Promise<SupabaseOrg[]> {
  const { stdout, exitCode } = await runCommand([
    'bunx',
    'supabase',
    'orgs',
    'list',
    '-o',
    'json',
  ]);

  if (exitCode !== 0) {
    throw new Error('Failed to list Supabase organizations');
  }

  return JSON.parse(stdout) as SupabaseOrg[];
}

export async function createSupabaseOrg(name: string): Promise<SupabaseOrg> {
  // Note: supabase orgs create doesn't support JSON output
  const { exitCode, stderr, stdout } = await runCommand([
    'bunx',
    'supabase',
    'orgs',
    'create',
    name,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `Failed to create Supabase organization: ${stderr || stdout}`,
    );
  }

  // After creation, fetch the org list to find the newly created org
  const orgs = await listSupabaseOrgs();
  const newOrg = orgs.find((o) => o.name.toLowerCase() === name.toLowerCase());

  if (!newOrg) {
    throw new Error(
      'Organization was created but could not be found. Please try again or use --supabase-org-id',
    );
  }

  return newOrg;
}

// ============================================================================
// Organization Selection
// ============================================================================

export async function getOrSelectSupabaseOrg(
  providedOrgId?: string,
  defaultOrgName?: string,
  noInteractive?: boolean,
  dryRun?: boolean,
): Promise<SupabaseOrg> {
  const orgs = await listSupabaseOrgs();

  // Use provided ID
  if (providedOrgId) {
    const org = orgs.find((o) => o.id === providedOrgId);
    if (!org) {
      throw new Error(
        `Supabase organization with ID ${providedOrgId} not found`,
      );
    }
    p.log.success(`Using Supabase org: ${org.name} (${org.id})`);
    return org;
  }

  // Non-interactive mode - use first org
  if (noInteractive) {
    const org = orgs[0];
    if (!org) {
      throw new Error(
        'No Supabase organizations found. Create one first or provide --supabase-org-id',
      );
    }
    p.log.success(`Using Supabase org: ${org.name} (${org.id})`);
    return org;
  }

  // Build select options
  const selectOptions = dryRun
    ? orgs.map((org) => ({ label: `${org.name} (${org.id})`, value: org.id }))
    : [
        {
          hint: 'Create a new organization',
          label: '➕ Create new',
          value: '__create_new__',
        },
        ...orgs.map((org) => ({
          label: `${org.name} (${org.id})`,
          value: org.id,
        })),
      ];

  if (selectOptions.length === 0) {
    throw new Error(
      'No Supabase organizations found. Please create one first with: bunx supabase orgs create',
    );
  }

  // Interactive selection
  const selected = await p.select({
    message: 'Select a Supabase organization:',
    options: selectOptions,
  });

  if (p.isCancel(selected)) {
    throw new Error('Cancelled by user');
  }

  // Handle "Create new" option
  if (selected === '__create_new__') {
    const orgName = await p.text({
      defaultValue: defaultOrgName,
      message: 'Enter a name for the new organization:',
      placeholder: defaultOrgName || 'my-organization',
      validate: (value: string) => {
        if (!value?.trim()) return 'Organization name is required';
      },
    });

    if (p.isCancel(orgName)) {
      throw new Error('Cancelled by user');
    }

    return withSpinner(
      'Creating Supabase organization...',
      () => createSupabaseOrg(orgName as string),
      `Created Supabase organization: ${orgName}`,
    );
  }

  const selectedOrg = orgs.find((o) => o.id === selected);
  if (!selectedOrg) {
    throw new Error('Invalid selection');
  }
  return selectedOrg;
}

// ============================================================================
// Project Management
// ============================================================================

export async function createSupabaseProject(
  name: string,
  orgId: string,
  dbPassword: string,
  region: string,
): Promise<SupabaseProject> {
  const { stdout, exitCode, stderr } = await runCommand([
    'bunx',
    'supabase',
    'projects',
    'create',
    name,
    '--org-id',
    orgId,
    '--db-password',
    dbPassword,
    '--region',
    region,
    '-o',
    'json',
  ]);

  if (exitCode !== 0) {
    throw new Error(`Failed to create Supabase project: ${stderr}`);
  }

  return JSON.parse(stdout) as SupabaseProject;
}

export async function waitForProjectReady(
  projectRef: string,
  maxAttempts = 30,
  intervalMs = 10000,
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { stdout, exitCode } = await runCommand(
      ['bunx', 'supabase', 'projects', 'list', '-o', 'json'],
      { silent: true },
    );

    if (exitCode === 0) {
      const projects = JSON.parse(stdout) as Array<{
        id: string;
        status: string;
      }>;
      const project = projects.find((proj) => proj.id === projectRef);

      if (project?.status === 'ACTIVE_HEALTHY') {
        return;
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }

  throw new Error('Timed out waiting for project to be ready');
}

// ============================================================================
// API Keys
// ============================================================================

export async function getSupabaseApiKeys(
  projectRef: string,
): Promise<SupabaseApiKey[]> {
  const { stdout, exitCode, stderr } = await runCommand([
    'bunx',
    'supabase',
    'projects',
    'api-keys',
    '--project-ref',
    projectRef,
    '-o',
    'json',
  ]);

  if (exitCode !== 0) {
    throw new Error(`Failed to get API keys: ${stderr}`);
  }

  return JSON.parse(stdout) as SupabaseApiKey[];
}

// ============================================================================
// Project Listing & Selection (for sync-secrets)
// ============================================================================

export async function listSupabaseProjects(): Promise<SupabaseProject[]> {
  const { stdout, exitCode } = await runCommand([
    'bunx',
    'supabase',
    'projects',
    'list',
    '-o',
    'json',
  ]);

  if (exitCode !== 0) {
    throw new Error('Failed to list Supabase projects');
  }

  return JSON.parse(stdout) as SupabaseProject[];
}

export async function selectSupabaseProject(
  noInteractive?: boolean,
): Promise<SupabaseProject> {
  const projects = await listSupabaseProjects();

  if (projects.length === 0) {
    throw new Error('No Supabase projects found. Create one first.');
  }

  // Non-interactive or single project - auto-select
  if (noInteractive || projects.length === 1) {
    const project = projects[0];
    if (project) {
      p.log.success(`Using Supabase project: ${project.name} (${project.id})`);
      return project;
    }
  }

  // Interactive selection
  const selected = await p.select({
    message: 'Select a Supabase project to sync from:',
    options: projects.map((proj) => ({
      hint: proj.region,
      label: `${proj.name} (${proj.id})`,
      value: proj.id,
    })),
  });

  if (p.isCancel(selected)) {
    throw new Error('Cancelled by user');
  }

  const selectedProject = projects.find((proj) => proj.id === selected);
  if (!selectedProject) {
    throw new Error('Invalid selection');
  }

  return selectedProject;
}

// ============================================================================
// Secret Fetching (for sync-secrets)
// ============================================================================

// Local Supabase demo keys (for dev environment)
const LOCAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export interface SupabaseSecrets {
  /** Project reference ID */
  projectRef: string;
  /** Region for connection strings */
  region: string;
  /** Secrets for dev environment (local) */
  dev: Record<string, string>;
  /** Secrets for staging/prod environments (remote) */
  production: Record<string, string>;
}

/**
 * Fetch all available secrets from a Supabase project.
 * Returns both dev (local) and production secrets.
 */
export async function getSupabaseProjectSecrets(
  project: SupabaseProject,
  dbPassword: string,
  localApiPort = 54321,
  localDbPort = 54322,
): Promise<SupabaseSecrets> {
  const apiKeys = await getSupabaseApiKeys(project.id);

  const anonKey = apiKeys.find((k) => k.name === 'anon')?.api_key;
  const serviceRoleKey = apiKeys.find(
    (k) => k.name === 'service_role',
  )?.api_key;

  if (!anonKey || !serviceRoleKey) {
    throw new Error('Could not find required API keys (anon and service_role)');
  }

  const supabaseUrl = `https://${project.id}.supabase.co`;
  const postgresUrl = `postgresql://postgres.${project.id}:${dbPassword}@aws-0-${project.region}.pooler.supabase.com:6543/postgres`;

  return {
    dev: {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: LOCAL_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${localApiPort}`,
      POSTGRES_DATABASE: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_URL: `postgresql://postgres:postgres@127.0.0.1:${localDbPort}/postgres`,
      SUPABASE_ANON_KEY: LOCAL_SUPABASE_ANON_KEY,
      SUPABASE_PROJECT_ID: project.id,
      SUPABASE_SERVICE_ROLE_KEY: LOCAL_SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_URL: `http://127.0.0.1:${localApiPort}`,
    },
    production: {
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      POSTGRES_DATABASE: 'postgres',
      POSTGRES_PASSWORD: dbPassword,
      POSTGRES_URL: postgresUrl,
      SUPABASE_ANON_KEY: anonKey,
      SUPABASE_PROJECT_ID: project.id,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      SUPABASE_URL: supabaseUrl,
    },
    projectRef: project.id,
    region: project.region,
  };
}
