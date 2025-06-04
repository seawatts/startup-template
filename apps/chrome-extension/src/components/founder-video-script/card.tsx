import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { ScriptButton } from './button';

export function FounderVideoScriptCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Founder Video Script</CardTitle>
        <CardDescription>
          Cook up a fire video script and key points to help you nail your
          pitch.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        <div className="mt-auto">
          <ScriptButton />
        </div>
      </CardContent>
    </Card>
  );
}
