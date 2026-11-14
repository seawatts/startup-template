// A labelled example. Long lines scroll inside the block, never the page.
export function CodeBlock({ label, text }: { label: string; text: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border bg-muted/40">
      <figcaption className="border-b px-4 py-2 text-muted-foreground text-xs">
        {label}
      </figcaption>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code>{text}</code>
      </pre>
    </figure>
  );
}
