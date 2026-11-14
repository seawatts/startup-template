import { readApiKey, recordApiKeyUse } from '@seawatts/api/api-key-context';
import { handleMcpRequest } from '@seawatts/api/mcp';
import {
  callOperation,
  describeOperations,
} from '@seawatts/api/operation-runtime';
import { after } from 'next/server';
import { productName } from '~/server/product';

// The MCP server: every catalog operation as a tool, for Claude and other
// MCP clients. Same credential and the same procedures as /api/v1, so a
// tool can do exactly what the API key can.
async function handler(request: Request) {
  const principal = await readApiKey(request.headers);
  if (!principal)
    return new Response('Send an active API key as a Bearer token', {
      headers: { 'WWW-Authenticate': 'Bearer' },
      status: 401,
    });
  after(() => recordApiKeyUse(principal));
  return handleMcpRequest(request, {
    call: (id, input) => callOperation(principal, id, input),
    instructions: `Tools read and change the ${productName} organization this API key belongs to.`,
    name: productName,
    operations: describeOperations(),
    version: '1',
  });
}

export { handler as GET, handler as POST };
