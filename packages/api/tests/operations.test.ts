import { expect, test } from 'bun:test';
import { operations, sessionOnly } from '../src/operations';

// The catalog is the one list the public interfaces are built from (REST,
// OpenAPI, SDK, CLI, MCP, the docs reference). These keep it honest against
// the procedures it names.

type Procedure = {
  '~orpc': { route: { method?: string }; inputSchema?: unknown };
};
const isProcedure = (node: unknown): node is Procedure =>
  typeof node === 'object' && node !== null && '~orpc' in node;

async function procedures() {
  // Loading the routers loads the database client, which wants a URL; no
  // query runs here.
  process.env.POSTGRES_URL ??= 'postgres://localhost:5432/unused';
  process.env.CI ??= 'true';
  const { appRouter } = await import('../src/root');
  const found = new Map<string, Procedure>();
  for (const [area, router] of Object.entries(appRouter))
    for (const [name, node] of Object.entries(router))
      if (isProcedure(node)) found.set(`${area}.${name}`, node);
  return found;
}

test('every procedure is in the catalog or session-only with a reason', async () => {
  const all = await procedures();
  const listed = new Set<string>(operations.map((operation) => operation.id));
  const unaccounted = [...all.keys()].filter(
    (id) => !listed.has(id) && !sessionOnly[id],
  );
  // Add each to `operations` (with a title and description) or to
  // `sessionOnly` (with the reason an API key must not call it).
  expect(unaccounted).toEqual([]);
  const both = [...listed].filter((id) => sessionOnly[id]);
  expect(both).toEqual([]);
  const stale = [...listed, ...Object.keys(sessionOnly)].filter(
    (id) => !all.has(id),
  );
  expect(stale).toEqual([]);
});

test('a catalog read is a GET procedure and a write is not', async () => {
  const all = await procedures();
  const wrong = operations.filter(
    (operation) =>
      (all.get(operation.id)?.['~orpc'].route.method === 'GET') !==
      (operation.access === 'read'),
  );
  expect(wrong.map((operation) => operation.id)).toEqual([]);
});

test('every operation reads as words and has an object input', async () => {
  process.env.POSTGRES_URL ??= 'postgres://localhost:5432/unused';
  process.env.CI ??= 'true';
  const { describeOperations } = await import('../src/operation-runtime');
  const described = describeOperations();
  expect(new Set(described.map((operation) => operation.id)).size).toBe(
    described.length,
  );
  for (const operation of described) {
    expect(operation.title.length).toBeGreaterThan(3);
    expect(operation.description.length).toBeGreaterThan(30);
    // MCP tools and the REST body both need an object.
    expect(operation.inputSchema.type).toBe('object');
  }
  for (const reason of Object.values(sessionOnly))
    expect(reason.length).toBeGreaterThan(10);
});
