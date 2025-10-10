import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';

import { FeatureWaitlistButton } from './feature-waitlist/button';
import { SubmitFeedbackButton } from './submit-feedback/button';

export function ComingSoonCard() {
  // const { data: features, isLoading } = api.productFeature.all.useQuery();

  // const comingSoonFeatures =
  //   features?.filter((feature) => feature.comingSoon) ?? [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Coming Soon... 👀</CardTitle>
        <CardDescription>
          Don't miss out! Join the waitlist and stay in the loop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* {isLoading ? (
          <div className="mb-4 flex justify-center">
            <Icons.Spinner className="h-6 w-6 animate-spin" />
          </div>
        ) : comingSoonFeatures.length > 0 ? (
          <Accordion type="single" collapsible className="mb-4">
            <AccordionItem value="item-1" className="border-b-0">
              <AccordionTrigger className="mt-0 pt-0">
                Upcoming Features
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {comingSoonFeatures.map((feature) => (
                    <li
                      key={feature.name}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="flex-shrink-0">{feature.emoji}</span>
                      <span>
                        <strong>{feature.name}:</strong> {feature.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null} */}
        <div className="flex flex-col gap-2">
          <FeatureWaitlistButton
            className="w-full"
            element="coming-soon-card"
            featureName="coming-soon"
          />
          <SubmitFeedbackButton
            className="w-full"
            element="coming-soon-card"
            type="feature-request"
          >
            Suggest a Feature
          </SubmitFeedbackButton>
        </div>
      </CardContent>
    </Card>
  );
}
