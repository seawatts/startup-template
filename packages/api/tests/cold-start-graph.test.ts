import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// What a cold server evaluates before its first answer is its cold start
// (docs/agents/speed.md). Each API area loads on first use, so an area's
// static imports are what its first read pays for. A package only a rare
// write needs (payments, email, PDFs, an AI SDK) loads with `await import()`
// inside that write, never at the top of the area. Static imports only: what
// loads on use is the point.
const root = resolve(import.meta.dirname, '../../..');
const scanner = new Bun.Transpiler({ loader: 'ts' });

function staticPackages(entry: string) {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const { kind, path: spec } of scanner.scanImports(
      readFileSync(file, 'utf8'),
    )) {
      if (kind === 'dynamic-import' || /\.(json|css)$/.test(spec)) continue;
      if (spec.startsWith('.') || spec.startsWith('@seawatts/'))
        visit(Bun.resolveSync(spec, dirname(file)));
      else packages.add(spec);
    }
  };
  visit(join(root, entry));
  return [...packages];
}

// Packages no area but the one named for them should load up front.
const writeOnly = ['stripe', 'resend', '@react-email/components'];

test("areas leave the rare writes' packages to the writes", () => {
  // `org` and `auth` loaded the Stripe SDK on every cold read for the one
  // write that creates an organization.
  for (const area of [
    'api-key-usage',
    'api-keys',
    'auth',
    'links',
    'operator',
    'org',
    'org-members',
    'user',
  ])
    expect(
      staticPackages(`packages/api/src/router/${area}.ts`).filter((name) =>
        writeOnly.includes(name),
      ),
    ).toEqual([]);
});
