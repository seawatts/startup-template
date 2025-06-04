import type React from 'react';
import { useEffect, useState } from 'react';

import { api } from '@acme/api/chrome-extension';
import { cn } from '@acme/ui';
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
import { useDebouncedValue } from '~/hooks/use-debounced-value';
import { useCompany } from '../company/context';
import { useEntitlement } from '../entitlement/hook';

export function ToneSelector({ className }: { className?: string }) {
  const portalElement = useChromePortal();
  const { company } = useCompany();
  const [selectedTone, setSelectedTone] = useState<string>('');
  const [customTone, setCustomTone] = useState<string>('');
  const debouncedCustomTone = useDebouncedValue(customTone);

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

  const updateToneMutation = api.application.updateTone.useMutation();
  const isEntitled = useEntitlement({ entitlement: 'custom_tone' });

  useEffect(() => {
    if (latestApplication?.tone.lookupKey) {
      setSelectedTone(latestApplication.tone.lookupKey);
      setCustomTone(latestApplication.customTone || '');
    } else if (tones?.length) {
      setSelectedTone(tones[0]?.lookupKey ?? '');
    }
  }, [latestApplication, tones]);

  const handleCustomToneChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const newValue = event.target.value;
    setCustomTone(newValue);
  };

  // Use an effect with the debounced value, but with proper conditions
  useEffect(() => {
    if (
      !company?.id ||
      !latestApplication?.id ||
      selectedTone !== 'custom' ||
      debouncedCustomTone === latestApplication.customTone ||
      !debouncedCustomTone
    )
      return;

    updateToneMutation.mutate({
      applicationId: latestApplication.id,
      companyId: company.id,
      customTone: debouncedCustomTone,
      toneName: 'custom',
    });
  }, [
    debouncedCustomTone,
    company?.id,
    latestApplication?.id,
    latestApplication?.customTone,
    selectedTone,
    updateToneMutation,
  ]);

  async function handleToneChange(value: string) {
    if (!company?.id || !latestApplication?.id) return;

    setSelectedTone(value);
    await updateToneMutation.mutateAsync({
      applicationId: latestApplication.id,
      companyId: company.id,
      customTone: value === 'custom' ? customTone : undefined,
      toneName: value,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={cn('flex flex-col gap-2', className)}>
        <Label htmlFor="tone-of-voice">Tone of Voice</Label>
        <Select
          onValueChange={handleToneChange}
          value={selectedTone}
          disabled={isLoading || isLoadingTones}
        >
          <SelectTrigger className="w-full">
            {isLoading || isLoadingTones ? (
              <div className="flex items-center gap-2">
                <Icons.Spinner />
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <SelectValue placeholder="Select Tone" />
            )}
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
            onChange={handleCustomToneChange}
            placeholder="Describe your desired tone of voice"
            required
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}
