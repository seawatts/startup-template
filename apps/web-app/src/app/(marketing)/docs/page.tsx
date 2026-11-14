import { Button } from '@seawatts/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';
import type { Metadata } from 'next';
import Link from 'next/link';
import { docsGuides } from '../_lib/docs';

export const metadata: Metadata = {
  description:
    'Guides for the REST API, the TypeScript SDK, the command line and the MCP server.',
  title: 'Documentation',
};

const cards = [
  ...docsGuides.map((guide) => ({
    href: `/docs/${guide.slug}`,
    summary: guide.summary,
    title: guide.title,
  })),
  {
    href: '/docs/reference',
    summary: 'Every operation, its input and an example call.',
    title: 'API reference',
  },
];

export default function DocsPage() {
  return (
    <>
      <h1 className="font-semibold text-3xl tracking-tight">Documentation</h1>
      <p className="mt-3 text-muted-foreground">
        Everything the app can do for your organization is also an API. Reach it
        from your code, your terminal or an AI assistant with one API key. All
        four ways run the same operations.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Card key={card.href}>
            <CardHeader>
              <CardTitle>{card.title}</CardTitle>
              <CardDescription>{card.summary}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild size="sm" variant="secondary">
                <Link href={card.href}>Read the guide</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
