'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useTRPC } from '@seawatts/api/react';
import { Icons } from '@seawatts/ui/custom/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@seawatts/ui/dialog';
import { Input } from '@seawatts/ui/input';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import posthog from 'posthog-js';
import { useState } from 'react';

export function CreateApiKeyDialog() {
  const api = useTRPC();
  const queryClient = useQueryClient();

  const createApiKey = useMutation(
    api.apiKeys.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          api.apiKeys.allWithLastUsage.pathFilter(),
        );
      },
    }),
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;

    try {
      // Track the API key creation
      posthog.capture('api_keys_created', {
        api_key_name: name.trim(),
      });

      await createApiKey.mutateAsync({ name });

      // Reset form and close dialog
      setName('');
      setOpen(false);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleCancel = () => {
    setName('');
    setOpen(false);
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <MetricButton metric="create_api_key_dialog_trigger_clicked">
          <IconPlus />
          Create API Key
        </MetricButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new API Key</DialogTitle>
          <DialogDescription>
            Please provide a name for your new API key.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate();
              }
            }}
            placeholder="Your API Key Name"
            value={name}
          />
        </div>

        <DialogFooter>
          <MetricButton
            disabled={createApiKey.isPending}
            metric="create_api_key_cancel_clicked"
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </MetricButton>
          <MetricButton
            disabled={!name.trim() || createApiKey.isPending}
            metric="create_api_key_submit_clicked"
            onClick={handleCreate}
          >
            {createApiKey.isPending ? (
              <>
                <Icons.Spinner className="animate-spin" size="sm" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </MetricButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
