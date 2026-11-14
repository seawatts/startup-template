// `<cli> api`: every public API operation from the terminal, with nothing
// written per operation. The list and each operation's input come from the
// server's catalog (`GET /api/v1`), so a new catalog entry is callable here
// as soon as the server has it.
//
//   <cli> api                         list the operations
//   <cli> api org.current             run a read
//   <cli> api org.updateName --name acme
//   <cli> api org.updateName --input '{"name":"acme"}'
//
// SEAWATTS_API_KEY holds the key; SEAWATTS_API_URL the app's address.

type CatalogOperation = {
  id: string;
  access: 'read' | 'write';
  title: string;
  description: string;
  inputSchema: { properties?: Record<string, { type?: string }> };
};

export type ApiCommandIo = {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  out: (line: string) => void;
  err: (line: string) => void;
};

// `--name acme --limit 5 --dry` becomes { name: 'acme', limit: 5, dry: true },
// with numbers and booleans read according to the operation's input schema.
export function inputFromFlags(
  flags: string[],
  schema: CatalogOperation['inputSchema'],
) {
  const input: Record<string, unknown> = {};
  for (let index = 0; index < flags.length; index++) {
    const flag = flags[index];
    if (!flag?.startsWith('--')) throw new Error(`Unexpected argument ${flag}`);
    const [name, inline] = flag.slice(2).split(/=(.*)/s);
    if (!name) throw new Error(`Unexpected argument ${flag}`);
    const type = schema.properties?.[name]?.type;
    const next = flags[index + 1];
    const value =
      inline ??
      (type === 'boolean' || next === undefined || next.startsWith('--')
        ? undefined
        : flags[++index]);
    if (name === 'input') {
      Object.assign(input, JSON.parse(value ?? '{}'));
      continue;
    }
    input[name] =
      value === undefined
        ? true
        : type === 'number' || type === 'integer'
          ? Number(value)
          : type === 'boolean'
            ? value !== 'false'
            : value;
  }
  return input;
}

export async function runApiCommand(
  args: string[],
  io: ApiCommandIo,
): Promise<number> {
  const baseUrl = (io.env.SEAWATTS_API_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  const catalog = await io.fetch(`${baseUrl}/api/v1`);
  if (!catalog.ok) {
    io.err(
      `Could not read the API catalog from ${baseUrl} (${catalog.status})`,
    );
    return 1;
  }
  const { operations } = (await catalog.json()) as {
    operations: CatalogOperation[];
  };
  const [id, ...flags] = args;
  if (!id || id === 'list' || id === '--help') {
    const width = Math.max(
      ...operations.map((operation) => operation.id.length),
    );
    for (const operation of operations)
      io.out(
        `${operation.id.padEnd(width)}  ${operation.access.padEnd(5)}  ${operation.title}`,
      );
    return 0;
  }
  const operation = operations.find((candidate) => candidate.id === id);
  if (!operation) {
    io.err(`Unknown operation ${id}. Run \`api\` to list them.`);
    return 1;
  }
  if (flags.includes('--help')) {
    io.out(`${operation.id} (${operation.access}): ${operation.description}`);
    for (const [name, property] of Object.entries(
      operation.inputSchema.properties ?? {},
    ))
      io.out(`  --${name} <${property.type ?? 'value'}>`);
    return 0;
  }
  const apiKey = io.env.SEAWATTS_API_KEY;
  if (!apiKey) {
    io.err('Set SEAWATTS_API_KEY to an API key from the app.');
    return 1;
  }
  let input: Record<string, unknown>;
  try {
    input = inputFromFlags(flags, operation.inputSchema);
  } catch (error) {
    io.err((error as Error).message);
    return 1;
  }
  const response = await io.fetch(`${baseUrl}/api/v1/${operation.id}`, {
    body: JSON.stringify(input),
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  const body = (await response.json().catch(() => null)) as {
    data?: unknown;
    error?: { code: string; message: string };
  } | null;
  if (!response.ok || !body) {
    io.err(
      body?.error
        ? `${body.error.code}: ${body.error.message}`
        : `Request failed with ${response.status}`,
    );
    return 1;
  }
  io.out(JSON.stringify(body.data, null, 2));
  return 0;
}
