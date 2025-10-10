import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';

import { FeatureWaitlistButton } from './feature-waitlist/button';

export function MarketResearchCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Research</CardTitle>
        <CardDescription>
          Get insights on your market size and potential.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* <Button className="flex w-full items-center" disabled={true}>
          <img
            src={logoIcon}
            alt="Acme"
            className="mb-0.5 mr-2 size-5"
          />
          Coming Soon
        </Button> */}
        <FeatureWaitlistButton
          element="market-research-card"
          featureName="market-research"
        />
      </CardContent>
    </Card>
  );
}
