import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { GenerateApplicationButton } from './button';

export function GenerateApplicationCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Auto-fill Application</CardTitle>
        <CardDescription>
          Level up your application! Auto-fill from your company deets, existing
          answers, and pitch deck.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        <div className="mt-auto">
          <GenerateApplicationButton />
        </div>
      </CardContent>
    </Card>
  );
}
