import { expect, test } from 'bun:test';
import { dirname, join } from 'node:path'; // Bun has no path primitive

// The package exports only its entry, so find its folder from there.
const driver = dirname(dirname(Bun.resolveSync('postgres', import.meta.dir)));

// patches/postgres@4.1.1.patch adds `sendsAsText` to the driver, which lets
// an unprepared query run in the round trip of its own Parse. A version bump
// that drops the patch (the patch names one version) would double every
// query's round trips without failing anything else, so this fails first.
// Re-make the patch on each bump (docs/agents/database.md).
test('the postgres.js patch is applied', async () => {
  const source = await Bun.file(join(driver, 'src/connection.js')).text();
  expect(source).toContain('function sendsAsText(');
  expect(source).toContain('!sendsAsText(values[i])');
});

test('the patch names the installed driver version', async () => {
  const root = new URL('../../../../', import.meta.url).pathname;
  const manifest: { patchedDependencies?: Record<string, string> } =
    await Bun.file(`${root}package.json`).json();
  const installed: { version: string } = await Bun.file(
    join(driver, 'package.json'),
  ).json();
  expect(Object.keys(manifest.patchedDependencies ?? {})).toContain(
    `postgres@${installed.version}`,
  );
});
