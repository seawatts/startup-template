import { readApiKey, recordApiKeyUse } from '@seawatts/api/api-key-context';
import { openApiDocument } from '@seawatts/api/openapi';
import {
  callOperation,
  describeOperations,
  OperationError,
} from '@seawatts/api/operation-runtime';
import { after } from 'next/server';
import { productName } from '~/server/product';

// The public API, generated from the operation catalog (packages/api
// operations.ts). An API key from the app's API keys page is the only
// credential it accepts; a browser session is not, so a page on another
// site can never call it with someone's cookie.
//
//   GET  /api/v1                 the catalog (no key needed)
//   GET  /api/v1/openapi.json    the OpenAPI document (no key needed)
//   POST /api/v1/<operation>     run it; input is the JSON body
//   GET  /api/v1/<operation>     the same, for a read that takes no input

const json = (body: unknown, status = 200) =>
  Response.json(body, { headers: { 'Cache-Control': 'no-store' }, status });
const refuse = (status: number, code: string, message: string) =>
  json({ error: { code, message } }, status);

async function handler(
  request: Request,
  { params }: { params: Promise<{ operation?: string[] }> },
) {
  const [id, ...rest] = (await params).operation ?? [];
  if (rest.length) return refuse(404, 'NOT_FOUND', 'Unknown path');
  const operations = describeOperations();

  if (request.method === 'GET' && !id) return json({ operations });
  if (request.method === 'GET' && id === 'openapi.json')
    return json(
      openApiDocument(operations, {
        serverUrl: new URL(request.url).origin,
        title: `${productName} API`,
      }),
    );

  const operation = operations.find((candidate) => candidate.id === id);
  if (!operation) return refuse(404, 'NOT_FOUND', `Unknown operation ${id}`);
  if (request.method === 'GET' && operation.access !== 'read')
    return refuse(405, 'METHOD_NOT_SUPPORTED', 'This operation is a POST');

  const principal = await readApiKey(request.headers);
  if (!principal)
    return refuse(
      401,
      'UNAUTHORIZED',
      'Send an active API key as `Authorization: Bearer <key>`',
    );
  // When the key was last used, written after the answer is sent.
  after(() => recordApiKeyUse(principal));

  let input: unknown;
  if (request.method === 'POST') {
    const text = await request.text();
    try {
      input = text ? JSON.parse(text) : undefined;
    } catch {
      return refuse(400, 'BAD_REQUEST', 'The body is not valid JSON');
    }
  }
  try {
    return json({
      data: (await callOperation(principal, operation.id, input)) ?? null,
    });
  } catch (error) {
    if (error instanceof OperationError)
      return refuse(error.status, error.code, error.message);
    throw error;
  }
}

export { handler as GET, handler as POST };
