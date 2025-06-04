import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { NotEntitled } from '../entitlement/not-entitled';
import { StripeCheckoutButton } from '../stripe-checkout/button';
import { UploadPitchDeckForm } from './form';

export function DocumentCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Pitch Deck</CardTitle>
        <CardDescription>
          Fill in your application from your pitch deck.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UploadPitchDeckForm />
        <NotEntitled entitlement="pitch_deck_upload">
          <StripeCheckoutButton className="mt-auto" />
        </NotEntitled>
      </CardContent>
    </Card>
  );
}
