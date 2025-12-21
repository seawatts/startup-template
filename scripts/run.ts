#!/usr/bin/env bun
/**
 * Script Runner
 *
 * Interactive CLI to select and run available scripts.
 *
 * Usage:
 *   bun scripts/run.ts
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import * as p from '@clack/prompts';
import { $ } from 'zx';

// Script metadata for display
const SCRIPT_INFO: Record<string, { description: string; icon: string }> = {
  'clone-project': {
    description:
      'Clone a project with Infisical, Supabase, PostHog, and Vercel',
    icon: '🚀',
  },
  'sync-secrets': {
    description: 'Sync secrets from services to Infisical',
    icon: '🔐',
  },
};

interface ScriptOption {
  description: string;
  icon: string;
  name: string;
  path: string;
}

function discoverScripts(): ScriptOption[] {
  const scriptsDir = import.meta.dir;
  const scripts: ScriptOption[] = [];

  const entries = readdirSync(scriptsDir);

  for (const entry of entries) {
    const fullPath = join(scriptsDir, entry);
    const stat = statSync(fullPath);

    // Skip directories and this file
    if (stat.isDirectory()) continue;
    if (entry === 'run.ts') continue;
    if (!entry.endsWith('.ts')) continue;

    const name = entry.replace('.ts', '');
    const info = SCRIPT_INFO[name] || {
      description: `Run ${name}`,
      icon: '📜',
    };

    scripts.push({
      description: info.description,
      icon: info.icon,
      name,
      path: fullPath,
    });
  }

  return scripts;
}

async function main() {
  console.clear();
  p.intro('🛠️  Script Runner');

  const scripts = discoverScripts();

  if (scripts.length === 0) {
    p.log.error('No scripts found in the scripts directory');
    process.exit(1);
  }

  const selected = await p.select({
    message: 'Select a script to run:',
    options: scripts.map((script) => ({
      hint: script.description,
      label: `${script.icon}  ${script.name}`,
      value: script.path,
    })),
  });

  if (p.isCancel(selected)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  const scriptPath = selected as string;
  const scriptName =
    scripts.find((s) => s.path === scriptPath)?.name || 'script';

  p.log.step(`Running ${scriptName}...`);
  console.log(''); // Add spacing before script output

  // Pass through all remaining arguments to the script
  const args = process.argv.slice(2);

  try {
    $.verbose = true;
    await $`bun ${scriptPath} ${args}`;
  } catch (error) {
    // Script already printed its output, just exit with error code
    process.exit(1);
  }
}

main();
