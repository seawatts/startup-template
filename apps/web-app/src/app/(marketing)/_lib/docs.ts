// The developer guides at /docs. Each guide is data: a few sections of
// short paragraphs with one example each. The API reference page is not
// here: it is generated from the operation catalog (packages/api
// operations.ts), so it can never drift from what the API serves.

export type DocsGuide = {
  slug: string;
  title: string;
  summary: string;
  sections: {
    heading: string;
    body: string[];
    code?: { label: string; text: string };
  }[];
};

export const docsGuides: DocsGuide[] = [
  {
    sections: [
      {
        body: [
          'Every call needs an API key. Create one on the API keys page in the app. A key acts as the person who created it, inside that organization, so it can do what the catalog allows and nothing more.',
        ],
        code: {
          label: 'Check your key',
          text: `curl -X POST https://your-app.example.com/api/v1/org.current \\
  -H "Authorization: Bearer $SEAWATTS_API_KEY"`,
        },
        heading: 'Authenticate',
      },
      {
        body: [
          'Each operation is a POST to /api/v1/ followed by its name, with the input as a JSON body. The answer has the result under "data". A read that takes no input also answers a plain GET.',
        ],
        code: {
          label: 'Rename the organization',
          text: `curl -X POST https://your-app.example.com/api/v1/org.updateName \\
  -H "Authorization: Bearer $SEAWATTS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"acme"}'`,
        },
        heading: 'Call an operation',
      },
      {
        body: [
          'A failed call returns an "error" with a code and a message you can show. 400 means the input was wrong and says how, 401 means the key is missing or inactive, 404 means the operation does not exist.',
        ],
        code: {
          label: 'An error',
          text: `{ "error": { "code": "BAD_REQUEST", "message": "Name can only contain lowercase letters, numbers, and hyphens" } }`,
        },
        heading: 'Handle errors',
      },
      {
        body: [
          'The full list of operations is served as an OpenAPI 3.1 document at /api/v1/openapi.json. Import it into an API client or generate a client in another language from it.',
        ],
        heading: 'OpenAPI',
      },
    ],
    slug: 'api',
    summary: 'Call the REST API with an API key and curl.',
    title: 'REST API',
  },
  {
    sections: [
      {
        body: [
          'The SDK is a typed client for the same operations. Method names match the operation names, inputs are checked as you type, and results are typed too.',
        ],
        code: {
          label: 'Create a client',
          text: `import { createSdk } from '@seawatts/sdk/client';

const sdk = createSdk({
  apiKey: process.env.SEAWATTS_API_KEY,
  baseUrl: 'https://your-app.example.com',
});

const org = await sdk.org.current();
await sdk.org.updateName({ name: 'acme' });`,
        },
        heading: 'Use the client',
      },
      {
        body: [
          'A failed call throws an SdkError. Its code is the same one the REST API returns, so you can branch on it; its message is safe to show.',
        ],
        code: {
          label: 'Catch a refusal',
          text: `import { SdkError } from '@seawatts/sdk/client';

try {
  await sdk.org.updateName({ name: 'Not Valid' });
} catch (error) {
  if (error instanceof SdkError && error.code === 'BAD_REQUEST') {
    console.log(error.message);
  }
}`,
        },
        heading: 'Handle errors',
      },
    ],
    slug: 'sdk',
    summary: 'Use the typed TypeScript client.',
    title: 'SDK',
  },
  {
    sections: [
      {
        body: [
          'The command line runs any operation without writing code. Set your key once, then list what is available. Listing needs no key.',
        ],
        code: {
          label: 'Set up and list',
          text: `export SEAWATTS_API_KEY=...
export SEAWATTS_API_URL=https://your-app.example.com

seawatts api`,
        },
        heading: 'Set up',
      },
      {
        body: [
          'Run an operation by name. Pass input as flags named after its fields, or as one JSON value with --input. Add --help after an operation to see its fields. The result prints as JSON, ready to pipe into another tool.',
        ],
        code: {
          label: 'Run operations',
          text: `seawatts api org.current
seawatts api org.updateName --name acme
seawatts api apiKeyUsage.recent --limit 5
seawatts api apiKeyUsage.stats --input '{"days":7}'`,
        },
        heading: 'Run an operation',
      },
    ],
    slug: 'cli',
    summary: 'Run operations from a terminal.',
    title: 'CLI',
  },
  {
    sections: [
      {
        body: [
          'The MCP server lets Claude and other AI assistants use your organization through the same operations. Each operation is a tool, described in words the assistant can choose by, and reads are marked read only.',
        ],
        heading: 'What it is',
      },
      {
        body: [
          'Add the server to your assistant with its address and an API key as a bearer token. The assistant can then do exactly what that key can. Create a separate key for each assistant so you can switch one off.',
        ],
        code: {
          label: 'Add to Claude Code',
          text: `claude mcp add --transport http seawatts \\
  https://your-app.example.com/api/mcp \\
  --header "Authorization: Bearer $SEAWATTS_API_KEY"`,
        },
        heading: 'Connect',
      },
      {
        body: [
          'Ask in plain words, such as "who is in my organization?" or "how many API calls did we make this week?". The assistant picks the tool, and asks before a tool that changes data when your client is set to confirm writes.',
        ],
        heading: 'Use it',
      },
    ],
    slug: 'mcp',
    summary: 'Connect Claude and other AI assistants.',
    title: 'MCP server',
  },
];

export const docsNav = [
  { href: '/docs', title: 'Overview' },
  ...docsGuides.map((guide) => ({
    href: `/docs/${guide.slug}`,
    title: guide.title,
  })),
  { href: '/docs/reference', title: 'API reference' },
];
