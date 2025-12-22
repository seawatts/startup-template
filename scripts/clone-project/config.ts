import type { InfisicalConfig, TomlConfig } from './types';

// ============================================================================
// Infisical Config
// ============================================================================

export async function readInfisicalConfig(): Promise<InfisicalConfig> {
  const configPath = '.infisical.json';
  const file = Bun.file(configPath);

  if (!(await file.exists())) {
    throw new Error(
      `.infisical.json not found. Please run 'infisical init' first.`,
    );
  }

  return JSON.parse(await file.text()) as InfisicalConfig;
}

export async function updateInfisicalConfig(
  workspaceId: string,
): Promise<void> {
  const config = await readInfisicalConfig();
  config.workspaceId = workspaceId;

  await Bun.write('.infisical.json', `${JSON.stringify(config, null, 2)}\n`);
}

// ============================================================================
// Supabase Config
// ============================================================================

const SUPABASE_CONFIG_PATH = 'packages/db/supabase/config.toml';

export async function readSupabaseConfig(): Promise<TomlConfig> {
  const file = Bun.file(SUPABASE_CONFIG_PATH);

  if (!(await file.exists())) {
    throw new Error(`Supabase config not found at ${SUPABASE_CONFIG_PATH}`);
  }

  const content = await file.text();
  return Bun.TOML.parse(content) as TomlConfig;
}

/**
 * Update the project_id in supabase/config.toml
 */
export async function updateSupabaseProjectId(
  projectName: string,
): Promise<void> {
  const file = Bun.file(SUPABASE_CONFIG_PATH);

  if (!(await file.exists())) {
    throw new Error(`Supabase config not found at ${SUPABASE_CONFIG_PATH}`);
  }

  let content = await file.text();

  // Replace the project_id line
  content = content.replace(
    /^project_id\s*=\s*"[^"]*"/m,
    `project_id = "${projectName}"`,
  );

  await Bun.write(SUPABASE_CONFIG_PATH, content);
}

// ============================================================================
// Drizzle Config
// ============================================================================

const DRIZZLE_CONFIG_PATH = 'packages/db/drizzle.config.ts';
const DRIZZLE_SCHEMA_PATH = 'packages/db/src/schema.ts';

/**
 * Sanitize a project name for use as a PostgreSQL schema name.
 * Converts dashes to underscores and removes invalid characters.
 */
export function sanitizeSchemaName(name: string): string {
  return name
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Update the drizzle.config.ts to use a custom PostgreSQL schema.
 * This adds migrations config and schemaFilter for the custom schema.
 */
export async function updateDrizzleConfig(projectName: string): Promise<void> {
  const file = Bun.file(DRIZZLE_CONFIG_PATH);

  if (!(await file.exists())) {
    throw new Error(`Drizzle config not found at ${DRIZZLE_CONFIG_PATH}`);
  }

  const schemaName = sanitizeSchemaName(projectName);

  // Generate the new drizzle.config.ts content
  const newContent = `import type { Config } from 'drizzle-kit';

import { env } from './src/env';

const nonPoolingUrl = (env.POSTGRES_URL ?? '').replace(':6543', ':5432');

export default {
  dbCredentials: { url: nonPoolingUrl },
  dialect: 'postgresql',
  migrations: {
    schema: '${schemaName}', // Store migrations table in our schema
    table: '__drizzle_migrations',
  },
  out: './drizzle',
  schema: './src/schema.ts',
  schemaFilter: ['${schemaName}'], // Only manage tables in this schema
} satisfies Config;
`;

  await Bun.write(DRIZZLE_CONFIG_PATH, newContent);
}

/**
 * Update the drizzle schema to use a custom PostgreSQL schema.
 * This adds a pgSchema definition and updates all tables to use it.
 */
export async function updateDrizzleSchema(projectName: string): Promise<void> {
  const file = Bun.file(DRIZZLE_SCHEMA_PATH);

  if (!(await file.exists())) {
    throw new Error(`Drizzle schema not found at ${DRIZZLE_SCHEMA_PATH}`);
  }

  const schemaName = sanitizeSchemaName(projectName);
  let content = await file.text();

  // Check if schema is already defined
  if (content.includes('pgSchema')) {
    // Update existing schema name
    content = content.replace(
      /export const schema = pgSchema\(['"][^'"]*['"]\)/,
      `export const schema = pgSchema('${schemaName}')`,
    );
  } else {
    // Add pgSchema to imports
    content = content.replace(
      /import \{([^}]*)\} from 'drizzle-orm\/pg-core';/,
      (_match, imports) => {
        const importList = imports
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
        if (!importList.includes('pgSchema')) {
          importList.push('pgSchema');
        }
        return `import {\n  ${importList.join(',\n  ')},\n} from 'drizzle-orm/pg-core';`;
      },
    );

    // Add schema definition after imports (before first export)
    const schemaDefinition = `\n// ============================================================================\n// DATABASE SCHEMA\n// ============================================================================\n\nexport const schema = pgSchema('${schemaName}');\n`;

    // Find the first section comment after imports
    const firstSectionMatch = content.match(
      /\/\/ ============================================================================\n\/\/ ENUMS/,
    );
    if (firstSectionMatch?.index) {
      content =
        content.slice(0, firstSectionMatch.index) +
        schemaDefinition +
        '\n' +
        content.slice(firstSectionMatch.index);
    }

    // Replace pgTable with schema.table
    content = content.replace(/pgTable\(/g, 'schema.table(');

    // Replace pgEnum with schema.enum
    content = content.replace(/pgEnum\(/g, 'schema.enum(');
  }

  await Bun.write(DRIZZLE_SCHEMA_PATH, content);
}

/**
 * Update Supabase config, Drizzle schema, and Drizzle config with the project name
 */
export async function updateProjectConfigs(projectName: string): Promise<void> {
  await updateSupabaseProjectId(projectName);
  await updateDrizzleSchema(projectName);
  await updateDrizzleConfig(projectName);
}
