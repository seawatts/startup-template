import { Button } from '@acme/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { NoCompany } from './company/no-company';

export function GetStartedCard() {
  return (
    <NoCompany>
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>
            Setup your company and start using vibe-check.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-grow flex-col">
          <div className="mt-auto" />

          <Button className="w-full" asChild>
            <a href="https://apply.ycombinator.com/app/edit">
              Finish Application
            </a>
          </Button>
        </CardContent>
      </Card>
    </NoCompany>
  );
}
