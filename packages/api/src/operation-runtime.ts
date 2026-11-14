import { createRouterClient, ORPCError } from '@orpc/server';
import { z } from 'zod';
import { type ApiKeyPrincipal, apiKeyContext } from './api-key-context';
import { type Operation, operations } from './operations';
import { appRouter } from './root';

// The catalog (operations.ts) joined to the procedures it names: the input
// each operation takes, and a way to call it as an API key. REST, OpenAPI
// and MCP are all built from these two functions.

type Procedure = { '~orpc': { inputSchema?: z.ZodType } };
const at = (tree: unknown, path: string[]) =>
  path.reduce<unknown>(
    (node, key) => (node as Record<string, unknown> | undefined)?.[key],
    tree,
  );

export type JsonSchema = Record<string, unknown>;
export type DescribedOperation = Operation & { inputSchema: JsonSchema };

const noInput: JsonSchema = {
  additionalProperties: false,
  properties: {},
  type: 'object',
};

let described: DescribedOperation[] | undefined;
export function describeOperations(): DescribedOperation[] {
  described ??= operations.map((operation) => {
    const procedure = at(appRouter, operation.id.split('.')) as
      | Procedure
      | undefined;
    if (!procedure?.['~orpc'])
      throw new Error(`Catalog operation ${operation.id} has no procedure`);
    const schema = procedure['~orpc'].inputSchema;
    const { $schema: _, ...inputSchema } = schema
      ? (z.toJSONSchema(schema, { io: 'input' }) as JsonSchema)
      : noInput;
    return { ...operation, inputSchema };
  });
  return described;
}

export class OperationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Runs one catalog operation as the key's person and organization, through
// the same procedure (and so the same checks) the app uses. Only ids in the
// catalog are reachable: a procedure left out cannot be called by name.
export async function callOperation(
  principal: ApiKeyPrincipal,
  id: string,
  input: unknown,
) {
  if (!operations.some((operation) => operation.id === id))
    throw new OperationError('NOT_FOUND', 404, `Unknown operation ${id}`);
  const client = createRouterClient(appRouter, {
    context: apiKeyContext(principal),
  });
  const call = at(client, id.split('.')) as (
    input: unknown,
  ) => Promise<unknown>;
  try {
    return await call(input ?? {});
  } catch (error) {
    if (error instanceof ORPCError)
      throw new OperationError(error.code, error.status, error.message);
    throw error;
  }
}
