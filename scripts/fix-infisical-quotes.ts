#!/usr/bin/env bun
/**
 * Fix Infisical Secrets - Remove Single Quotes
 *
 * Goes through all Infisical secrets in all environments and removes
 * any single quotes from secret values.
 *
 * Usage:
 *   bun scripts/fix-infisical-quotes.ts
 */

import { readInfisicalConfig } from './clone-project/config';
import {
  ENVIRONMENTS,
  type Environment,
  type Secret,
} from './clone-project/types';
import { p, runCommand, withSpinner } from './clone-project/utils';

// ============================================================================
// Secret Operations
// ============================================================================

async function exportSecrets(
  projectId: string,
  env: Environment,
): Promise<Secret[]> {
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
    throw new Error(`Failed to export secrets for ${env} environment`);
  }

  return JSON.parse(stdout) as Secret[];
}

async function setSecret(
  projectId: string,
  env: Environment,
  key: string,
  value: string,
): Promise<void> {
  // Use the CLI to set the secret - need to properly escape the value
  const { exitCode, stderr } = await runCommand(
    [
      'infisical',
      'secrets',
      'set',
      `--env=${env}`,
      `--projectId=${projectId}`,
      `${key}=${value}`,
    ],
    { silent: true },
  );

  if (exitCode !== 0) {
    throw new Error(`Failed to set secret ${key} for ${env}: ${stderr}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.clear();
  p.intro('🔧 Fix Infisical Secrets - Remove Single Quotes');

  try {
    // Step 1: Get project ID from config
    const config = await readInfisicalConfig();
    const projectId = config.workspaceId;

    if (!projectId) {
      p.log.error('No workspaceId found in .infisical.json');
      process.exit(1);
    }

    p.log.info(`Project ID: ${projectId}`);

    let totalFixed = 0;

    // Step 2: Process each environment
    for (const env of ENVIRONMENTS) {
      p.log.step(`Processing ${env} environment...`);

      const secrets = await withSpinner(
        `Exporting secrets from ${env}...`,
        async () => exportSecrets(projectId, env),
        `Exported secrets from ${env}`,
      );

      // Find secrets with single quotes
      const secretsWithQuotes = secrets.filter((s) => s.value.includes("'"));

      if (secretsWithQuotes.length === 0) {
        p.log.success(`No secrets with single quotes in ${env}`);
        continue;
      }

      p.log.warn(
        `Found ${secretsWithQuotes.length} secret(s) with single quotes in ${env}:`,
      );

      for (const secret of secretsWithQuotes) {
        const oldValue = secret.value;
        const newValue = oldValue.replaceAll("'", '');

        // Skip if the new value would be empty (Infisical doesn't allow empty values)
        if (!newValue.trim()) {
          p.log.warn(
            `  - ${secret.key}: "${oldValue}" → (empty) - SKIPPED (empty values not allowed)`,
          );
          continue;
        }

        p.log.info(`  - ${secret.key}: "${oldValue}" → "${newValue}"`);

        await withSpinner(
          `Updating ${secret.key}...`,
          async () => setSecret(projectId, env, secret.key, newValue),
          `Updated ${secret.key}`,
        );

        totalFixed++;
      }
    }

    // Done!
    if (totalFixed > 0) {
      p.outro(`✨ Fixed ${totalFixed} secret(s) across all environments!`);
    } else {
      p.outro('✅ No secrets needed fixing!');
    }

    // Show link to Infisical project
    p.note(
      `https://app.infisical.com/project/${projectId}/secrets/overview`,
      '🔐 View in Infisical',
    );

    console.log('');
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
