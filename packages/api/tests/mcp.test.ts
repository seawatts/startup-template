import { expect, test } from 'bun:test';
import { handleMcpRequest, type McpHandlerOptions } from '../src/mcp';

const options: McpHandlerOptions = {
  call: async (id, input) => {
    if (id === 'things.remove')
      throw Object.assign(new Error('Not yours'), { code: 'FORBIDDEN' });
    if (id === 'things.break') throw new Error('secret detail');
    return { id, input };
  },
  name: 'Test',
  operations: [
    {
      access: 'read',
      description: 'Lists the things in the organization.',
      id: 'things.list',
      inputSchema: { properties: {}, type: 'object' },
      title: 'List things',
    },
    {
      access: 'write',
      description: 'Removes one thing for good.',
      destructive: true,
      id: 'things.remove',
      inputSchema: { properties: {}, type: 'object' },
      title: 'Remove a thing',
    },
    {
      access: 'write',
      description: 'Fails in a way the caller cannot fix.',
      id: 'things.break',
      inputSchema: { properties: {}, type: 'object' },
      title: 'Break',
    },
  ],
  version: '1',
};

const rpc = async (body: unknown) => {
  const response = await handleMcpRequest(
    new Request('http://test/api/mcp', {
      body: JSON.stringify(body),
      method: 'POST',
    }),
    options,
  );
  return {
    body: response.status === 202 ? null : await response.json(),
    status: response.status,
  };
};

test('initialize agrees a protocol version and offers tools', async () => {
  const { body } = await rpc({
    id: 1,
    jsonrpc: '2.0',
    method: 'initialize',
    params: { protocolVersion: '2025-03-26' },
  });
  expect(body.result.protocolVersion).toBe('2025-03-26');
  expect(body.result.capabilities).toEqual({ tools: {} });
  const unknown = await rpc({
    id: 2,
    jsonrpc: '2.0',
    method: 'initialize',
    params: { protocolVersion: '1999-01-01' },
  });
  expect(unknown.body.result.protocolVersion).toBe('2025-06-18');
});

test('a notification is accepted with no answer', async () => {
  const { status, body } = await rpc({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });
  expect(status).toBe(202);
  expect(body).toBeNull();
});

test('tools/list names every operation and marks reads and removals', async () => {
  const { body } = await rpc({ id: 1, jsonrpc: '2.0', method: 'tools/list' });
  const tools = body.result.tools as {
    name: string;
    annotations: { readOnlyHint: boolean; destructiveHint: boolean };
  }[];
  expect(tools.map((tool) => tool.name)).toEqual([
    'things_list',
    'things_remove',
    'things_break',
  ]);
  expect(tools[0]?.annotations.readOnlyHint).toBe(true);
  expect(tools[1]?.annotations.destructiveHint).toBe(true);
});

test('tools/call runs the operation and returns its result as text', async () => {
  const { body } = await rpc({
    id: 1,
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { arguments: { limit: 2 }, name: 'things_list' },
  });
  expect(JSON.parse(body.result.content[0].text)).toEqual({
    id: 'things.list',
    input: { limit: 2 },
  });
  expect(body.result.isError).toBeUndefined();
});

test('a refusal is a tool error with its reason; an outage hides detail', async () => {
  const refused = await rpc({
    id: 1,
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: 'things_remove' },
  });
  expect(refused.body.result.isError).toBe(true);
  expect(refused.body.result.content[0].text).toBe('FORBIDDEN: Not yours');
  const broken = await rpc({
    id: 2,
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: 'things_break' },
  });
  expect(broken.body.result.isError).toBe(true);
  expect(broken.body.result.content[0].text).not.toContain('secret');
});

test('unknown tools and methods are protocol errors; GET is refused', async () => {
  const tool = await rpc({
    id: 1,
    jsonrpc: '2.0',
    method: 'tools/call',
    params: { name: 'nope' },
  });
  expect(tool.body.error.code).toBe(-32602);
  const method = await rpc({ id: 1, jsonrpc: '2.0', method: 'resources/list' });
  expect(method.body.error.code).toBe(-32601);
  const get = await handleMcpRequest(
    new Request('http://test/api/mcp'),
    options,
  );
  expect(get.status).toBe(405);
});
