#!/usr/bin/env node
// The entry point. `api …` runs one public API operation and exits with its
// result (lib/api-command/run.ts); anything else starts the interactive
// app. Each is loaded only when chosen, so a script calling `api` never
// loads the terminal UI or the system keychain.
if (process.argv[2] === 'api') {
  const { runApiCommand } = await import('./lib/api-command/run');
  process.exitCode = await runApiCommand(process.argv.slice(3), {
    env: process.env,
    err: (line) => console.error(line),
    fetch,
    out: (line) => console.log(line),
  });
} else {
  await import('./interactive');
}
