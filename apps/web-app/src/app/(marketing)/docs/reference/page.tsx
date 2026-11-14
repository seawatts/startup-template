import { describeOperations } from '@seawatts/api/operation-runtime';
import { Badge } from '@seawatts/ui/badge';
import type { Metadata } from 'next';
import { CodeBlock } from '../../_components/docs/code-block';

export const metadata: Metadata = {
  description: 'Every API operation, its input and an example call.',
  title: 'API reference',
};

type Property = {
  type?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
};

// "number, 1 to 100, default 50": a field's rules in words.
function describeProperty(property: Property) {
  const parts = [
    property.enum
      ? property.enum.map((value) => `"${value}"`).join(' or ')
      : (property.type ?? 'value'),
  ];
  const low = property.minimum ?? property.minLength;
  const high = property.maximum ?? property.maxLength;
  if (low !== undefined && high !== undefined) parts.push(`${low} to ${high}`);
  if (property.default !== undefined)
    parts.push(`default ${JSON.stringify(property.default)}`);
  return parts.join(', ');
}

const example = (
  id: string,
  properties: Record<string, Property>,
  required: string[],
) => {
  const body = Object.fromEntries(
    required.map((name) => [
      name,
      properties[name]?.type === 'number' ? 1 : 'value',
    ]),
  );
  const lines = [
    `curl -X POST https://your-app.example.com/api/v1/${id} \\`,
    `  -H "Authorization: Bearer $SEAWATTS_API_KEY"`,
  ];
  if (required.length)
    lines.push(
      `${lines.pop()} \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '${JSON.stringify(body)}'`,
    );
  return lines.join('\n');
};

// Generated from the operation catalog at build time: an operation added to
// the catalog appears here with no change to this page.
export default function DocsReferencePage() {
  const operations = describeOperations();
  return (
    <>
      <h1 className="font-semibold text-3xl tracking-tight">API reference</h1>
      <p className="mt-3 text-muted-foreground">
        {operations.length} operations. Each is a POST to /api/v1/ followed by
        its name, a method of the same name in the SDK, a command in the CLI and
        a tool in the MCP server.
      </p>
      {operations.map((operation) => {
        const properties = (operation.inputSchema.properties ?? {}) as Record<
          string,
          Property
        >;
        const required = (operation.inputSchema.required ?? []) as string[];
        const names = Object.keys(properties);
        return (
          <section
            className="mt-10 scroll-mt-24 space-y-4"
            id={operation.id}
            key={operation.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-xl tracking-tight">
                {operation.title}
              </h2>
              <Badge
                variant={operation.access === 'read' ? 'secondary' : 'default'}
              >
                {operation.access === 'read' ? 'Read' : 'Write'}
              </Badge>
            </div>
            <code className="block break-all text-muted-foreground text-sm">
              {operation.id}
            </code>
            <p className="leading-relaxed">{operation.description}</p>
            {names.length > 0 && (
              <dl className="divide-y rounded-lg border text-sm">
                {names.map((name) => (
                  <div
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
                    key={name}
                  >
                    <dt className="font-medium font-mono sm:w-40 sm:shrink-0">
                      {name}
                    </dt>
                    <dd className="text-muted-foreground">
                      {required.includes(name) ? 'Required' : 'Optional'}:{' '}
                      {describeProperty(properties[name] ?? {})}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <CodeBlock
              label="Example"
              text={example(operation.id, properties, required)}
            />
          </section>
        );
      })}
    </>
  );
}
