import { expect, test } from 'bun:test';
import { inputFromFlags, runApiCommand } from './run';

const catalog = {
  operations: [
    {
      access: 'read',
      description: 'Lists recent usage for the organization.',
      id: 'usage.recent',
      inputSchema: {
        properties: { limit: { type: 'number' }, mine: { type: 'boolean' } },
      },
      title: 'List recent usage',
    },
  ],
};

const run = async (args: string[], env: Record<string, string> = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  const calls: Request[] = [];
  const code = await runApiCommand(args, {
    env: { SEAWATTS_API_URL: 'http://app.test', ...env },
    err: (line) => err.push(line),
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input as string, init);
      calls.push(request);
      return request.method === 'GET'
        ? Response.json(catalog)
        : Response.json({ data: [{ id: 'use_1' }] });
    }) as typeof fetch,
    out: (line) => out.push(line),
  });
  return { calls, code, err, out };
};

test('flags are read by the type the operation declares', () => {
  const schema = catalog.operations[0]?.inputSchema ?? {};
  expect(inputFromFlags(['--limit', '5', '--mine'], schema)).toEqual({
    limit: 5,
    mine: true,
  });
  expect(inputFromFlags(['--input', '{"limit":2}'], schema)).toEqual({
    limit: 2,
  });
  expect(() => inputFromFlags(['stray'], schema)).toThrow();
});

test('with no operation it lists the catalog and needs no key', async () => {
  const { code, out } = await run([]);
  expect(code).toBe(0);
  expect(out).toEqual(['usage.recent  read   List recent usage']);
});

test('an operation is posted with the key and its result printed', async () => {
  const { calls, code, out } = await run(['usage.recent', '--limit', '5'], {
    SEAWATTS_API_KEY: 'key_1',
  });
  expect(code).toBe(0);
  expect(calls[1]?.url).toBe('http://app.test/api/v1/usage.recent');
  expect(calls[1]?.headers.get('authorization')).toBe('Bearer key_1');
  expect(await calls[1]?.json()).toEqual({ limit: 5 });
  expect(JSON.parse(out.join('\n'))).toEqual([{ id: 'use_1' }]);
});

test('a missing key or unknown operation is an error, not a call', async () => {
  const noKey = await run(['usage.recent']);
  expect(noKey.code).toBe(1);
  expect(noKey.calls.length).toBe(1);
  const unknown = await run(['nope'], { SEAWATTS_API_KEY: 'key_1' });
  expect(unknown.code).toBe(1);
  expect(unknown.err[0]).toContain('Unknown operation');
});
