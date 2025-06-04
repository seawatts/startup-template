import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { NotEntitled } from '../entitlement/not-entitled';
import { StripeCheckoutButton } from '../stripe-checkout/button';
import { ToneSelector } from './selector';

export function ToneCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Tone</CardTitle>
        <CardDescription>
          Customize the tone of your application
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
        <ToneSelector />
        <NotEntitled entitlement="custom_tone">
          <StripeCheckoutButton className="mt-auto" />
        </NotEntitled>
      </CardContent>
    </Card>
  );
}
