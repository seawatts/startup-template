import { useEffect, useState } from 'react';

import { api } from '@acme/api/chrome-extension';
import { cn } from '@acme/ui';
import { Alert, AlertDescription, AlertTitle } from '@acme/ui/alert';
import { Icons } from '@acme/ui/icons';
import { Label } from '@acme/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@acme/ui/select';
import { Textarea } from '@acme/ui/textarea';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { useCompany } from './company/context';
import { useEntitlement } from './entitlement/hook';
import { NotEntitled } from './entitlement/not-entitled';
import { StripeCheckoutButton } from './stripe-checkout/button';

export function ToneSelector({
  className,
  includeEntitlementAlert = true,
}: {
  className?: string;
  includeEntitlementAlert?: boolean;
}) {
  const portalElement = useChromePortal();
  const { company, application } = useCompany();

  const [selectedTone, setSelectedTone] = useState<string>('');
  const [customTone, setCustomTone] = useState<string>('');
  const [debouncedCustomTone, setDebouncedCustomTone] = useState<string>('');
  const [shouldUpdate, setShouldUpdate] = useState(false);
  const isEntitled = useEntitlement({ entitlement: 'custom_tone' });

  const { data: tones, isLoading: isLoadingTones } = api.tone.all.useQuery();

  const { data: latestApplication, isLoading } =
    api.application.lastSelected.useQuery(
      {
        companyId: company?.id ?? '',
      },
      {
        enabled: !!company?.id,
      },
    );

  api.application.updateTone.useMutation();

  // Initial setup of tones
  useEffect(() => {
    if (latestApplication?.tone.lookupKey) {
      setSelectedTone(latestApplication.tone.lookupKey);
      setCustomTone(latestApplication.customTone || '');
      setDebouncedCustomTone(latestApplication.customTone || '');
    } else if (tones && tones.length > 0) {
      setSelectedTone(tones[0]?.lookupKey ?? '');
    }
  }, [latestApplication, tones]);

  // Debounce custom tone changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customTone !== debouncedCustomTone) {
        setDebouncedCustomTone(customTone);
        setShouldUpdate(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [customTone, debouncedCustomTone]);

  // Handle updates to the server
  useEffect(() => {
    if (!shouldUpdate) return;

    const updateTone = async () => {
      if (
        company?.id &&
        application?.id &&
        selectedTone === 'custom' &&
        debouncedCustomTone !== latestApplication?.customTone
      ) {
        // try {
        // await updateToneMutation.mutateAsync({
        //   applicationId: company.applicationId,
        //   companyId: company.id,
        //   customTone: debouncedCustomTone,
        //   toneName: "custom",
        // });
        // } catch (error) {
        // console.error('Failed to update tone:', error);
        // }
      }
      setShouldUpdate(false);
    };

    updateTone();
  }, [
    shouldUpdate,
    debouncedCustomTone,
    company?.id,
    application?.id,
    selectedTone,
    latestApplication?.customTone,
  ]);

  const handleToneChange = (value: string) => {
    if (!company?.id || !application?.id) return;

    setSelectedTone(value);
    // updateToneMutation.mutate({
    //   applicationId: company.applicationId,
    //   companyId: company.id,
    //   toneName: value,
    // });
  };

  const handleCustomToneChange = (value: string) => {
    setCustomTone(value);
  };

  if (isLoading || isLoadingTones) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('flex flex-col gap-2', className)}>
        <Label htmlFor="tone-of-voice">Tone of Voice</Label>
        <Select
          onValueChange={handleToneChange}
          value={selectedTone}
          // disabled={!isEntitled.isEntitled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Tone" />
          </SelectTrigger>
          <SelectContent portalContainer={portalElement}>
            {tones?.map((tone) => (
              <SelectItem
                key={tone.lookupKey}
                value={tone.lookupKey}
                disabled={!isEntitled.isEntitled}
              >
                {tone.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTone === 'custom' && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="tone">Custom Tone Description</Label>
          <Textarea
            id="tone"
            value={customTone}
            onChange={(event) => handleCustomToneChange(event.target.value)}
            placeholder="Describe your desired tone of voice"
            required
          />
        </div>
      )}
      {includeEntitlementAlert && (
        <NotEntitled entitlement="custom_tone">
          <Alert>
            <Icons.Info className="text-green-500" />
            <div className="flex flex-wrap justify-between gap-6">
              <div>
                <AlertTitle>Customize the tone of your application</AlertTitle>
                <AlertDescription>
                  This will allow our AI to generate more comprehensive and
                  tailored answers.
                </AlertDescription>
              </div>
              <div>
                <StripeCheckoutButton />
              </div>
            </div>
          </Alert>
        </NotEntitled>
      )}
    </div>
  );
}
