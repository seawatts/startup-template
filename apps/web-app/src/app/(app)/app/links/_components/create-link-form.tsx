'use client';

import { useORPC } from '@seawatts/api/react/react';
import { Button } from '@seawatts/ui/button';
import { Card, CardContent } from '@seawatts/ui/card';
import { Field, FieldGroup, FieldLabel } from '@seawatts/ui/field';
import { Input } from '@seawatts/ui/input';
import { toast } from '@seawatts/ui/sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function CreateLinkForm() {
  const api = useORPC();
  const queryClient = useQueryClient();
  const [redirectUrl, setRedirectUrl] = useState('');
  const [code, setCode] = useState('');
  const create = useMutation(
    api.links.create.mutationOptions({
      onError: (error) =>
        toast.error('The link was not made', { description: error.message }),
      onSuccess: (link) => {
        // Refresh only the list this save changed.
        queryClient.invalidateQueries({ queryKey: api.links.list.key() });
        setRedirectUrl('');
        setCode('');
        toast.success(`/s/${link.code} is ready`);
      },
    }),
  );

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({
              code: code.trim() || undefined,
              redirectUrl: redirectUrl.trim(),
            });
          }}
        >
          <FieldGroup className="gap-4 md:flex-row md:items-end">
            <Field className="md:flex-[2]">
              <FieldLabel htmlFor="link-destination">Destination</FieldLabel>
              <Input
                id="link-destination"
                inputMode="url"
                onChange={(event) => setRedirectUrl(event.target.value)}
                placeholder="https://example.com/launch"
                required
                type="url"
                value={redirectUrl}
              />
            </Field>
            <Field className="md:flex-1">
              <FieldLabel htmlFor="link-code">Code (optional)</FieldLabel>
              <Input
                autoCapitalize="none"
                id="link-code"
                onChange={(event) => setCode(event.target.value)}
                placeholder="launch"
                value={code}
              />
            </Field>
            <Button
              className="md:w-auto"
              disabled={create.isPending || !redirectUrl.trim()}
              type="submit"
            >
              {create.isPending ? 'Creating…' : 'Create link'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
