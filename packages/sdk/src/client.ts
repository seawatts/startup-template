import type { OperationId } from '@seawatts/api/operations';
import type { RouterInputs, RouterOutputs } from '@seawatts/api/root';

// The typed client for the public API: `sdk.org.current()`,
// `sdk.org.updateName({ name })`. Its shape is the operation catalog
// (packages/api operations.ts), so adding an operation there adds a method
// here with no code in this package. Only types are imported from the API
// package: none of its server code reaches a bundle that uses the SDK.

// What a value looks like after a trip through JSON: dates arrive as ISO
// strings.
type Json<T> = T extends Date
  ? string
  : T extends (infer Item)[]
    ? Json<Item>[]
    : T extends object
      ? { [Key in keyof T]: Json<T[Key]> }
      : T;

type Area<Id extends string> = Id extends `${infer A}.${string}` ? A : never;
type NameIn<
  Id extends string,
  A extends string,
> = Id extends `${A}.${infer Name}` ? Name : never;
type At<Tree, A, Name> = A extends keyof Tree
  ? Name extends keyof Tree[A]
    ? Tree[A][Name]
    : never
  : never;
// A method takes no argument when the operation has no input, an optional
// one when every field has a default, and a required one otherwise.
type Method<Input, Output> = undefined extends Input
  ? (input?: Input) => Promise<Json<Output>>
  : (input: Input) => Promise<Json<Output>>;

export type Sdk = {
  [A in Area<OperationId>]: {
    [Name in NameIn<OperationId, A>]: Method<
      At<RouterInputs, A, Name>,
      At<RouterOutputs, A, Name>
    >;
  };
};

export class SdkError extends Error {
  override name = 'SdkError';
  constructor(
    /** `UNAUTHORIZED`, `BAD_REQUEST`, `NOT_FOUND`, … */
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type SdkOptions = {
  /** An API key from the app's API keys page. */
  apiKey: string;
  /** The app's address, such as https://app.example.com. */
  baseUrl: string;
  fetch?: typeof fetch;
};

export function createSdk(options: SdkOptions): Sdk {
  const send = options.fetch ?? fetch;
  const call = async (id: string, input: unknown) => {
    const response = await send(
      `${options.baseUrl.replace(/\/$/, '')}/api/v1/${id}`,
      {
        body: JSON.stringify(input ?? {}),
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      },
    );
    const body = (await response.json().catch(() => null)) as {
      data?: unknown;
      error?: { code?: string; message?: string };
    } | null;
    if (!response.ok || !body)
      throw new SdkError(
        body?.error?.code ?? 'UNKNOWN',
        response.status,
        body?.error?.message ?? `Request failed with ${response.status}`,
      );
    return body.data;
  };
  // `sdk.<area>.<name>(input)` posts to `/api/v1/<area>.<name>`; the types
  // above limit the names to the catalog's.
  return new Proxy(
    {},
    {
      get: (_, area: string) =>
        new Proxy(
          {},
          {
            get: (_, name: string) => (input?: unknown) =>
              call(`${area}.${name}`, input),
          },
        ),
    },
  ) as Sdk;
}
