import { expect, test } from 'bun:test';

// One Bun version for the whole repository: `packageManager` in the root
// package.json. A workflow, script or doc that names another one fails here.

const root = new URL('../../', import.meta.url).pathname;
const manifest: { packageManager?: string } = await Bun.file(
  `${root}package.json`,
).json();
const pinned = manifest.packageManager?.match(/^bun@(\d+\.\d+\.\d+)$/)?.[1];

const folders = ['.github', 'tooling', 'docs', 'scripts', 'apps', 'packages'];
const files = new Bun.Glob('**/*.{yml,yaml,md,mdx,sh,json,toml}');
const skipped = /(^|\/)(node_modules|\.next|\.turbo|dist|build|coverage)\//;

async function scannedFiles(): Promise<string[]> {
  const paths = ['README.md', 'CLAUDE.md', 'package.json'];
  for (const folder of folders) {
    for await (const path of files.scan({
      cwd: `${root}${folder}`,
      dot: true,
    })) {
      if (!skipped.test(`/${path}`)) paths.push(`${folder}/${path}`);
    }
  }
  return paths;
}

// Each pattern captures the version that a line names.
const mentions = [
  /bun-version:\s*["']?(\w[^\s"'#]*)/g,
  /\bbun@(\d+\.\d+\.\d+|latest|canary)\b/g,
  /\bBUN_VERSION\s*[=:]\s*["']?(\w[^\s"'#]*)/g,
  /\boven\/bun:(\w[^\s"'#]*)/g,
  /\bbun-v(\d+\.\d+\.\d+)\b/g,
  /\bbun upgrade\b.*?(\d+\.\d+\.\d+|--canary)/g,
];

export function namedVersions(text: string): string[] {
  return mentions.flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => match[1] ?? ''),
  );
}

// Docker tags carry a suffix (`1.2.23-alpine`); the version is what precedes it.
function agrees(version: string, pin: string): boolean {
  return version === pin || version.startsWith(`${pin}-`);
}

test('packageManager pins one exact Bun version', () => {
  expect(pinned).toBeDefined();
});

test('no workflow, script or doc names another Bun version', async () => {
  const wrong: string[] = [];
  const paths = await scannedFiles();
  expect(paths.length).toBeGreaterThan(20);
  for (const path of paths) {
    const lines = (await Bun.file(`${root}${path}`).text()).split('\n');
    lines.forEach((line, index) => {
      for (const version of namedVersions(line)) {
        if (!agrees(version, pinned ?? '')) {
          wrong.push(`${path}:${index + 1} names ${version}`);
        }
      }
    });
  }
  expect(wrong).toEqual([]);
});

test('the Vercel runtime is the same major version', async () => {
  const vercel: { bunVersion?: string } = await Bun.file(
    `${root}apps/web-app/vercel.json`,
  ).json();
  // Vercel accepts only a major range here, so the major is what can agree.
  expect(vercel.bunVersion).toBe(`${pinned?.split('.')[0]}.x`);
});

test('the scan catches each way of naming a version', () => {
  expect(namedVersions('bun-version: latest')).toEqual(['latest']);
  expect(namedVersions('bun-version: "1.0.0"')).toEqual(['1.0.0']);
  expect(namedVersions('"packageManager": "bun@1.0.0"')).toEqual(['1.0.0']);
  expect(namedVersions('FROM oven/bun:1.0.0-alpine')).toEqual(['1.0.0-alpine']);
  expect(namedVersions('BUN_VERSION=1.0.0')).toEqual(['1.0.0']);
  expect(namedVersions('uses: oven-sh/setup-bun@v2')).toEqual([]);
  expect(namedVersions('bun install')).toEqual([]);
});
