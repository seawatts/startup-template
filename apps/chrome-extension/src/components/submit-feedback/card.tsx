import type React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { SubmitFeedbackButton } from './button';
import type { SubmitFeedbackType } from './types';

export function SubmitFeedbackCard({
  type,
  element,
  children,
}: {
  type: SubmitFeedbackType;
  children?: React.ReactNode;
  element?: string;
}) {
  let title = 'Suggest Feature';
  let description = "Don't see what you need? Let us know what you'd like!";

  if (type === 'feedback') {
    title = 'Submit Feedback';
    description = 'Let us know what you think!';
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        <div className="flex-grow">{children}</div>
        <div className="mt-auto">
          <SubmitFeedbackButton type={type} element={element} />
        </div>
      </CardContent>
    </Card>
  );
}
