import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { FeatureWaitlistButton } from './feature-waitlist/button';

export function CompetitorsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitors</CardTitle>
        <CardDescription>Get a list of other YC competitors.</CardDescription>
      </CardHeader>
      <CardContent>
        <FeatureWaitlistButton
          featureName="competitors"
          element="competitors-card"
        />
      </CardContent>
    </Card>
  );
}
