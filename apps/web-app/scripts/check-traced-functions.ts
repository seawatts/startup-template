// Loads every server function the way the host will: from only the files its
// trace lists, on the runtime production uses.
//
// `next start` and the test suites see all of node_modules. A deployed
// function has only its traced files, and the trace follows Node's module
// resolution, so a package that loads locally can be missing or unresolvable
// in production on another runtime. For each function this script links the
// traced files into an empty folder, then starts the runtime there and loads
// the packages the bundle leaves external and the function's entry file.
//
// Run after a build: `bun run check:trace` (docs/agents/bun.md).
import {
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readlink,
  rm,
  symlink,
} from 'node:fs/promises'; // Bun has no primitive for links or directories
import { builtinModules } from 'node:module'; // the list of built-ins is Node's own
import { tmpdir } from 'node:os'; // Bun has no temp-directory primitive
import { dirname, join, relative, resolve } from 'node:path'; // Bun has no path primitive

const app = resolve(import.meta.dir, '..');
const repository = resolve(app, '../..');
const server = join(app, '.next/server');
const runtime = process.env.TRACE_RUNTIME ?? 'bun';
const only = process.argv.slice(2);

type Trace = { files: string[] };
type Result = { entry: string; externals: External[]; error?: string };

const builtins = new Set(builtinModules);

export type External = {
  /** How the chunk asks: `import()` or `require()`. */
  how: 'import' | 'require';
  name: string;
};

/**
 * Packages a chunk asks the runtime for instead of bundling, and how: the
 * bundle's `.y("name")` is an `import()`, `.x("name")` a `require()`. The two
 * resolve a package's export conditions differently, and a runtime with a
 * condition of its own (`bun`) can ask for a file the trace does not list.
 */
export function externalPackages(chunk: string): External[] {
  const found = new Map<string, External>();
  for (const [, letter, name = ''] of chunk.matchAll(/\.([xy])\("([^"]+)"/g)) {
    if (name.startsWith('node:') || name.startsWith('next/')) continue;
    if (builtins.has(name)) continue;
    const how = letter === 'y' ? 'import' : 'require';
    found.set(`${how}:${name}`, { how, name });
  }
  return [...found.values()];
}

async function materialise(trace: string, into: string): Promise<string[]> {
  const { files }: Trace = await Bun.file(trace).json();
  const paths = [
    trace.replace(/\.nft\.json$/, ''),
    ...files.map((file) => resolve(dirname(trace), file)),
  ];
  for (const path of paths) {
    const target = join(into, relative(repository, path));
    await mkdir(dirname(target), { recursive: true });
    const stats = await lstat(path);
    if (stats.isSymbolicLink())
      await symlink(await readlink(path), target).catch(ignoreExisting);
    else if (stats.isFile()) await place(path, target);
  }
  return paths;
}

// A hard link is instant; the temp folder on a build machine is often
// another filesystem, where only a copy works.
async function place(path: string, target: string) {
  try {
    await link(path, target);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EXDEV') await copyFile(path, target);
    else if (code !== 'EEXIST') throw error;
  }
}

function ignoreExisting(error: NodeJS.ErrnoException) {
  if (error.code !== 'EEXIST') throw error;
}

// Runs inside the materialised folder, on the target runtime, from beside
// the chunks so a package resolves as it does for them. Each external is
// loaded the way its chunk asks for it.
const loader = `
const { createRequire } = require('node:module');
const [entry, ...externals] = process.argv.slice(2);
const requireHere = createRequire(__filename);
(async () => {
  for (const external of externals) {
    const [how, name] = external.split(':');
    if (how === 'import') await import(name);
    else requireHere(name);
  }
  require(entry);
})().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
`;

async function check(trace: string): Promise<Result> {
  const entry = relative(app, trace.replace(/\.nft\.json$/, ''));
  const into = await mkdtemp(join(tmpdir(), 'traced-function-'));
  try {
    const paths = await materialise(trace, into);
    const chunks = paths.filter(
      (path) => path.startsWith(join(server, 'chunks')) && path.endsWith('.js'),
    );
    const externals = new Map<string, External>();
    for (const chunk of chunks) {
      for (const external of externalPackages(await Bun.file(chunk).text()))
        externals.set(`${external.how}:${external.name}`, external);
    }
    const inside = (path: string) => join(into, relative(repository, path));
    const load = inside(join(server, 'chunks/load-externals.cjs'));
    await Bun.write(load, loader);
    const run = Bun.spawn(
      [runtime, load, inside(join(app, entry)), ...externals.keys()],
      { cwd: inside(app), stderr: 'pipe', stdout: 'ignore' },
    );
    const [code, stderr] = await Promise.all([
      run.exited,
      new Response(run.stderr).text(),
    ]);
    return {
      entry,
      externals: [...externals.values()],
      ...(code === 0 ? {} : { error: stderr.trim() }),
    };
  } finally {
    await rm(into, { force: true, recursive: true });
  }
}

if (import.meta.main) {
  const traces: string[] = [];
  // Routes and pages, and the two functions every request passes: the proxy
  // (traced as middleware) and instrumentation.
  const functions = [
    new Bun.Glob('app/**/{route,page}.js.nft.json'),
    new Bun.Glob('{middleware,instrumentation}.js.nft.json'),
  ];
  for (const glob of functions) {
    for await (const path of glob.scan({ cwd: server, dot: true })) {
      if (only.length === 0 || only.some((part) => path.includes(part)))
        traces.push(join(server, path));
    }
  }
  if (traces.length === 0) {
    console.error(
      'No traced functions under .next/server/app. Build the app first.',
    );
    process.exit(1);
  }
  const results: Result[] = [];
  for (const trace of traces.sort()) results.push(await check(trace));
  const failed = results.filter((result) => result.error);
  const withExternals = results.filter((result) => result.externals.length > 0);
  console.log(
    `${results.length} functions loaded from their traced files on ${runtime}; ` +
      `${withExternals.length} use external packages (${[...new Set(withExternals.flatMap((result) => result.externals.map((external) => external.name)))].join(', ') || 'none'}).`,
  );
  for (const result of failed)
    console.error(`\n${result.entry}\n${result.error}`);
  if (failed.length > 0) {
    console.error(`\n${failed.length} failed to load.`);
    // The usual cause on Bun: the trace follows Node's resolution, and the
    // package has a build of its own for Bun that the trace does not list.
    if (runtime === 'bun')
      console.error(
        'If an external package is missing only on Bun, it has a `bun` export condition: name the files of that build in `outputFileTracingIncludes` (docs/agents/bun.md), or stop marking the package external.',
      );
    process.exit(1);
  }
}
