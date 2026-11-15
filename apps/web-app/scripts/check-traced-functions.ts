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
type Result = { entry: string; externals: string[]; error?: string };

const builtins = new Set(builtinModules);

/** Packages a chunk asks the runtime for instead of bundling. */
export function externalPackages(chunk: string): string[] {
  const names = [...chunk.matchAll(/\.[xy]\("([^"]+)"/g)].map(
    (match) => match[1] ?? '',
  );
  return [...new Set(names)].filter(
    (name) =>
      !name.startsWith('node:') &&
      !builtins.has(name) &&
      !name.startsWith('next/'),
  );
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
    else if (stats.isFile()) await link(path, target).catch(ignoreExisting);
  }
  return paths;
}

function ignoreExisting(error: NodeJS.ErrnoException) {
  if (error.code !== 'EEXIST') throw error;
}

// Runs inside the materialised folder, on the target runtime.
const loader = `
const { createRequire } = require('node:module');
const [entry, from, ...externals] = process.argv.slice(2);
const requireFrom = createRequire(from);
(async () => {
  for (const name of externals) await import(requireFrom.resolve(name));
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
    const externals = new Set<string>();
    for (const chunk of chunks) {
      for (const name of externalPackages(await Bun.file(chunk).text()))
        externals.add(name);
    }
    const inside = (path: string) => join(into, relative(repository, path));
    await Bun.write(join(into, 'load.cjs'), loader);
    const run = Bun.spawn(
      [
        runtime,
        join(into, 'load.cjs'),
        inside(join(app, entry)),
        inside(join(server, 'chunks/x.js')),
        ...externals,
      ],
      { cwd: inside(app), stderr: 'pipe', stdout: 'ignore' },
    );
    const [code, stderr] = await Promise.all([
      run.exited,
      new Response(run.stderr).text(),
    ]);
    return {
      entry,
      externals: [...externals],
      ...(code === 0 ? {} : { error: stderr.trim() }),
    };
  } finally {
    await rm(into, { force: true, recursive: true });
  }
}

if (import.meta.main) {
  const traces: string[] = [];
  for await (const path of new Bun.Glob('app/**/{route,page}.js.nft.json').scan(
    { cwd: server, dot: true },
  )) {
    if (only.length === 0 || only.some((part) => path.includes(part)))
      traces.push(join(server, path));
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
      `${withExternals.length} use external packages (${[...new Set(withExternals.flatMap((result) => result.externals))].join(', ') || 'none'}).`,
  );
  for (const result of failed)
    console.error(`\n${result.entry}\n${result.error}`);
  if (failed.length > 0) {
    console.error(`\n${failed.length} failed to load.`);
    process.exit(1);
  }
}
