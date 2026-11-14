import type { DescribedOperation } from './operation-runtime';

// The OpenAPI 3.1 document for the public API, generated from the catalog.
// Every operation is `POST /api/v1/<id>` with its input as a JSON body and
// its result under `data`; a read that takes no input also answers GET.
export function openApiDocument(
  operations: DescribedOperation[],
  options: { title: string; serverUrl: string; version?: string },
) {
  const paths: Record<string, unknown> = {};
  for (const operation of operations) {
    const takesInput =
      Object.keys(
        (operation.inputSchema.properties as Record<string, unknown>) ?? {},
      ).length > 0;
    paths[`/api/v1/${operation.id}`] = {
      post: {
        description: operation.description,
        operationId: operation.id,
        ...(takesInput && {
          requestBody: {
            content: { 'application/json': { schema: operation.inputSchema } },
          },
        }),
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: { data: {} },
                  required: ['data'],
                  type: 'object',
                },
              },
            },
            description: 'The result.',
          },
          default: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
            description: 'The call failed; `error.code` says why.',
          },
        },
        summary: operation.title,
        tags: [operation.id.split('.')[0]],
        'x-access': operation.access,
      },
    };
  }
  return {
    components: {
      schemas: {
        Error: {
          properties: {
            error: {
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
              required: ['code', 'message'],
              type: 'object',
            },
          },
          required: ['error'],
          type: 'object',
        },
      },
      securitySchemes: { apiKey: { scheme: 'bearer', type: 'http' } },
    },
    info: { title: options.title, version: options.version ?? '1' },
    openapi: '3.1.0',
    paths,
    security: [{ apiKey: [] }],
    servers: [{ url: options.serverUrl }],
  };
}
