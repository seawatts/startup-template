import type { DescribedOperation } from './operation-runtime';

// A Model Context Protocol server over plain HTTP: every catalog operation
// is a tool. Stateless JSON-RPC, one JSON answer per POST, no session and no
// stream, which is all tool calls need and what a serverless function can
// serve. The caller supplies the operations and how to run one, so this
// file knows nothing about API keys or the database.

const protocolVersions = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const mcpToolName = (operationId: string) =>
  operationId.replaceAll('.', '_');

export type McpHandlerOptions = {
  name: string;
  version: string;
  instructions?: string;
  operations: DescribedOperation[];
  /** Runs one operation; throws an Error with `code` for a refusal. */
  call: (operationId: string, input: unknown) => Promise<unknown>;
};

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const result = (id: JsonRpcRequest['id'], value: unknown) => ({
  id,
  jsonrpc: '2.0',
  result: value,
});
const failure = (id: JsonRpcRequest['id'], code: number, message: string) => ({
  error: { code, message },
  id: id ?? null,
  jsonrpc: '2.0',
});

async function answer(request: JsonRpcRequest, options: McpHandlerOptions) {
  const { id, method, params } = request;
  if (request.jsonrpc !== '2.0' || typeof method !== 'string')
    return failure(id, -32600, 'Invalid request');
  // A notification (no id) gets no answer.
  if (id === undefined) return null;
  switch (method) {
    case 'initialize': {
      const asked = String(params?.protocolVersion ?? '');
      return result(id, {
        capabilities: { tools: {} },
        instructions: options.instructions,
        protocolVersion: protocolVersions.includes(asked)
          ? asked
          : protocolVersions[0],
        serverInfo: { name: options.name, version: options.version },
      });
    }
    case 'ping':
      return result(id, {});
    case 'tools/list':
      return result(id, {
        tools: options.operations.map((operation) => ({
          annotations: {
            destructiveHint:
              operation.access === 'write' && operation.destructive === true,
            openWorldHint: false,
            readOnlyHint: operation.access === 'read',
            title: operation.title,
          },
          description: `${operation.description} ${
            operation.access === 'read' ? 'Read only.' : 'Changes data.'
          }`,
          inputSchema: operation.inputSchema,
          name: mcpToolName(operation.id),
          title: operation.title,
        })),
      });
    case 'tools/call': {
      const operation = options.operations.find(
        (candidate) => mcpToolName(candidate.id) === params?.name,
      );
      if (!operation)
        return failure(id, -32602, `Unknown tool ${String(params?.name)}`);
      try {
        const value = await options.call(operation.id, params?.arguments);
        return result(id, {
          content: [{ text: JSON.stringify(value ?? null), type: 'text' }],
        });
      } catch (error) {
        // A refusal the model can act on (bad input, not allowed) is a tool
        // result marked as an error, not a protocol failure.
        const code = (error as { code?: unknown }).code;
        if (typeof code !== 'string' || code === 'INTERNAL_SERVER_ERROR')
          return result(id, {
            content: [{ text: 'The operation failed.', type: 'text' }],
            isError: true,
          });
        return result(id, {
          content: [
            { text: `${code}: ${(error as Error).message}`, type: 'text' },
          ],
          isError: true,
        });
      }
    }
    default:
      return failure(id, -32601, `Method not found: ${method}`);
  }
}

export async function handleMcpRequest(
  request: Request,
  options: McpHandlerOptions,
): Promise<Response> {
  if (request.method !== 'POST')
    return new Response(null, { headers: { Allow: 'POST' }, status: 405 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(failure(null, -32700, 'Parse error'), { status: 400 });
  }
  const batch = Array.isArray(body);
  const answers = (
    await Promise.all(
      (batch ? (body as JsonRpcRequest[]) : [body as JsonRpcRequest]).map(
        (entry) => answer(entry, options),
      ),
    )
  ).filter((entry) => entry !== null);
  // Only notifications: accepted, nothing to say.
  if (answers.length === 0) return new Response(null, { status: 202 });
  return Response.json(batch ? answers : answers[0], {
    headers: { 'Cache-Control': 'no-store' },
  });
}
