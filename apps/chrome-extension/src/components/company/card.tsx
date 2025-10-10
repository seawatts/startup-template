import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';

import { CompanyForm } from './form';

export function CreateCompanyCard() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Company</CardTitle>
        <CardDescription>Create or update your company</CardDescription>
      </CardHeader>
      <CardContent>
        <CompanyForm />
      </CardContent>
    </Card>
  );
}
