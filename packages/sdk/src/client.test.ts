import { expect, test } from 'bun:test';
import { createSdk, SdkError } from './client';

const sdkWith = (respond: (request: Request) => Response) => {
  const seen: Request[] = [];
  const sdk = createSdk({
    apiKey: 'key_1',
    baseUrl: 'https://app.example.com/',
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input as string, init);
      seen.push(request);
      return respond(request);
    }) as typeof fetch,
  });
  return { sdk, seen };
};

test('a method posts its input to the operation and returns the data', async () => {
  const { sdk, seen } = sdkWith(() =>
    Response.json({ data: { id: 'org_1', name: 'acme' } }),
  );
  const org = await sdk.org.updateName({ name: 'acme' });
  expect(org?.name).toBe('acme');
  expect(seen[0]?.url).toBe('https://app.example.com/api/v1/org.updateName');
  expect(seen[0]?.method).toBe('POST');
  expect(seen[0]?.headers.get('authorization')).toBe('Bearer key_1');
  expect(await seen[0]?.json()).toEqual({ name: 'acme' });
});

test('a refusal throws an SdkError with the code and status', async () => {
  const { sdk } = sdkWith(() =>
    Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Send a key' } },
      { status: 401 },
    ),
  );
  const error = await sdk.org.current().catch((caught) => caught);
  expect(error).toBeInstanceOf(SdkError);
  expect(error.code).toBe('UNAUTHORIZED');
  expect(error.status).toBe(401);
});
