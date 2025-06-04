import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { ShareLinkButton } from './button';

export function ShareLinkCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Get Feedback</CardTitle>
        <CardDescription>
          Share your application with other founders to get valuable feedback
          and insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        <div className="mt-auto">
          <ShareLinkButton />
        </div>
      </CardContent>
    </Card>
  );
}
