import { Markdown } from '@acme/ui/markdown';

interface FeedbackProps {
  content: string;
}

export function Feedback({ content }: FeedbackProps) {
  if (!content) return null;

  return (
    <Markdown content={content} className="text-sm text-muted-foreground" />
  );
}
