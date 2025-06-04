import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';

import { FeatureWaitlistButton } from './feature-waitlist/button';

export function EvaluateApplicationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vibe-check Application</CardTitle>
        <CardDescription>
          Get an AI-powered evaluation of your YC application to improve your
          chances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* <Button
          className="mb-2 flex w-full items-center"
          onClick={handleEvaluateApplication}
          disabled={
            !companyDetails ||
            Object.keys(companyDetails).length === 0 ||
            Object.values(companyDetails).every((value) => !value)
          }
        >
          <img
            src={logoIcon}
            alt="Acme"
            className="mb-0.5 mr-2 size-5"
          />
          Vibe-check
        </Button> */}
        <FeatureWaitlistButton
          featureName="evaluate-application"
          element="evaluate-application-card"
        />
        {/* <div className="flex items-center space-x-2">
          <Checkbox
            id="evaluate-individual-inputs"
            checked={useIndividualInputsEvaluate}
            onCheckedChange={(checked) =>
              setUseIndividualInputsEvaluate(checked as boolean)
            }
          />
          <label
            htmlFor="evaluate-individual-inputs"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show for individual fields.
          </label>
        </div> */}
      </CardContent>
    </Card>
  );
}
