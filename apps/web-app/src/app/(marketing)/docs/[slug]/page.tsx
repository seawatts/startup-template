import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CodeBlock } from '../../_components/docs/code-block';
import { docsGuides } from '../../_lib/docs';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () =>
  docsGuides.map((guide) => ({ slug: guide.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = docsGuides.find((candidate) => candidate.slug === slug);
  return guide ? { description: guide.summary, title: guide.title } : {};
}

export default async function DocsGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = docsGuides.find((candidate) => candidate.slug === slug);
  if (!guide) notFound();
  return (
    <>
      <h1 className="font-semibold text-3xl tracking-tight">{guide.title}</h1>
      <p className="mt-3 text-muted-foreground">{guide.summary}</p>
      {guide.sections.map((section) => (
        <section className="mt-10 space-y-4" key={section.heading}>
          <h2 className="font-semibold text-xl tracking-tight">
            {section.heading}
          </h2>
          {section.body.map((paragraph) => (
            <p className="leading-relaxed" key={paragraph}>
              {paragraph}
            </p>
          ))}
          {section.code && <CodeBlock {...section.code} />}
        </section>
      ))}
    </>
  );
}
