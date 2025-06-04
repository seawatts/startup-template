import { isEmpty } from 'lodash-es';
import type * as React from 'react';
import { useEffect, useState } from 'react';

import { api } from '@acme/api/chrome-extension';
import { Input } from '@acme/ui/input';
import { Label } from '@acme/ui/label';
import { Textarea } from '@acme/ui/textarea';

import { useDebouncedValue } from '~/hooks/use-debounced-value';
import { useYcApp } from '~/hooks/yc/use-yc-app';
import { useCompany } from './context';
import { NoCompany } from './no-company';

export function CompanyForm() {
  const { company } = useCompany();
  const [companyName, setCompanyName] = useState(company?.profile.name ?? '');
  const [companyDescription, setCompanyDescription] = useState(
    company?.profile.description ?? '',
  );
  const [companyWebsite, setCompanyWebsite] = useState(
    company?.profile.website ?? '',
  );
  const debouncedName = useDebouncedValue(companyName);
  const debouncedDescription = useDebouncedValue(companyDescription);
  const debouncedWebsite = useDebouncedValue(companyWebsite);
  const { app } = useYcApp();
  const _apiUtils = api.useUtils();

  // Track if we're currently updating to prevent loops
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync with company changes, but only if we're not in the middle of an update
  useEffect(() => {
    if (!company) return;

    setCompanyName(company.profile.name ?? '');
    setCompanyDescription(company.profile.description ?? '');
    setCompanyWebsite(company.profile.website ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // const createCompany = api.company.create.useMutation();
  // const updateCompany = api.company.updateProfile.useMutation();

  // Handle debounced updates
  useEffect(() => {
    if (!company?.id || !app?.uuid) return;
    if (isEmpty(debouncedName)) return;

    const hasChanges =
      debouncedName !== company.profile.name ||
      debouncedDescription !== company.profile.description ||
      debouncedWebsite !== company.profile.website;

    if (hasChanges && !isUpdating) {
      const updateCompanyDetails = async () => {
        try {
          setIsUpdating(true);
          // await updateCompany.mutateAsync({
          //   companyId: company.id,
          //   description: debouncedDescription,
          //   name: debouncedName,
          //   website: debouncedWebsite,
          // });
          // await apiUtils.application.byExternalId.invalidate({
          //   externalId: app.uuid,
          // });
        } catch (error) {
          console.error('Failed to update company:', error);
        } finally {
          setIsUpdating(false);
        }
      };

      updateCompanyDetails();
    }
  }, [
    company?.id,
    company?.profile.name,
    company?.profile.description,
    company?.profile.website,
    debouncedName,
    debouncedDescription,
    debouncedWebsite,
    app?.uuid,
    isUpdating,
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!app?.uuid) {
      console.error('No YC ID found');
      return;
    }
    if (isEmpty(companyName)) return;
    if (isUpdating) return;

    // await createCompany.mutateAsync({
    //   application: {
    //     externalId: app.uuid,
    //     metadata: {
    //       interviewInPerson: app.interviewInPerson,
    //       interviewQuestionsFilledIn: app.interviewQuestionsFilledIn,
    //       interviewTime: app.interviewTime,
    //       interviewWithin30Min: app.interviewWithin30Min,
    //       interviewZoomUrl: app.interviewZoomUrl,
    //       invited: app.invited,
    //       lastMessageRepliedTo: app.lastMessageRepliedTo,
    //       submitted: app.submitted,
    //       submittedAt: app.submittedAt,
    //       ycMessageCount: app.ycMessageCount,
    //     },
    //   },
    //   profile: {
    //     description: companyDescription,
    //     name: companyName,
    //     website: companyWebsite,
    //   },
    // });

    // await apiUtils.application.byExternalId.invalidate({
    //   externalId: app.uuid,
    // });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-y-4 px-4 lg:px-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Enter your company name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="companyDescription">Summary</Label>
          <Textarea
            id="companyDescription"
            placeholder="Enter a short description of your company"
            value={companyDescription}
            onChange={(event) => setCompanyDescription(event.target.value)}
          />
        </div>
        {/* <div className="flex flex-col gap-2">
          <Label htmlFor="companyWebsite">Website</Label>
          <Input
            id="companyWebsite"
            placeholder="Enter your company website"
            value={companyWebsite}
            onChange={(event) => setCompanyWebsite(event.target.value)}
          />
        </div> */}
      </div>
      <NoCompany>
        {/* <Button type="submit" disabled={createCompany.isPending}>
          <img src={logoIcon} alt="Acme" className="mb-0.5 mr-2 size-5" />
          {createCompany.isPending && <Icons.Spinner className="mr-2" />}
          {createCompany.isPending ? 'Creating...' : 'Create'}
        </Button> */}
      </NoCompany>
    </form>
  );
}
