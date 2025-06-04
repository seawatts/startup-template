import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { Entitled } from '../entitlement/entitled';
import { NotEntitled } from '../entitlement/not-entitled';
import { StripeCheckoutButton } from '../stripe-checkout/button';
import { PitchPracticeButton } from './button';

export function PitchPracticeCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Pitch Practice</CardTitle>
        <CardDescription>
          Practice your pitch with ai and get feedback on your answers.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col">
        <Entitled entitlement="pitch_practice">
          <div className="mt-auto">
            <PitchPracticeButton />
          </div>
        </Entitled>
        <NotEntitled entitlement="pitch_practice">
          <StripeCheckoutButton className="mt-auto" />
        </NotEntitled>
      </CardContent>
    </Card>
  );
}
