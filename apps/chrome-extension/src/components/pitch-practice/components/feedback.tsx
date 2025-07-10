import { Markdown } from '@acme/ui/markdown';

interface FeedbackProps {
  content: string;
}

export function Feedback({ content }: FeedbackProps) {
  if (!content) return null;

  return (
    <Markdown className="text-sm text-muted-foreground" content={content} />
  );
}
