'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTRPC } from '@seawatts/api/react';
import { useActiveOrganization, useSession } from '@seawatts/auth/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';
import { Button } from '@seawatts/ui/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@seawatts/ui/components/form';
import { Input } from '@seawatts/ui/components/input';
import { Icons } from '@seawatts/ui/custom/icons';
import { cn } from '@seawatts/ui/lib/utils';
import { toast } from '@seawatts/ui/sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { env } from '~/env.client';

// Constants
const VALIDATION_REGEX = /^[a-z0-9-_]+$/;
const DEBOUNCE_DELAY = 500;

// Validation utilities
const validateNameFormat = (name: string, minLength: number) => {
  if (name.length < minLength) return null;
  if (!VALIDATION_REGEX.test(name)) {
    return 'Name can only contain lowercase letters, numbers, hyphens, and underscores';
  }
  return null;
};

// Validation state type
interface ValidationState {
  checking: boolean;
  available: boolean | null;
  message: string;
}

// Custom hook for name validation
function useNameValidation(
  name: string,
  minLength: number,
  checkAvailability: (
    name: string,
  ) => Promise<{ available: boolean | string | undefined; message: string }>,
) {
  const [validation, setValidation] = useState<ValidationState>({
    available: null,
    checking: false,
    message: '',
  });

  const validate = useCallback(
    async (nameToValidate: string) => {
      console.log(
        'Validating name:',
        nameToValidate,
        'with minLength:',
        minLength,
      );

      // Early return for empty or too short names
      if (nameToValidate.length < minLength) {
        console.log('Name too short, clearing validation');
        setValidation({ available: null, checking: false, message: '' });
        return;
      }

      // Check format validity
      const formatError = validateNameFormat(nameToValidate, minLength);
      if (formatError) {
        console.log('Format error:', formatError);
        setValidation({
          available: null,
          checking: false,
          message: formatError,
        });
        return;
      }

      console.log('Starting availability check for:', nameToValidate);
      setValidation({ available: null, checking: true, message: '' });

      try {
        const result = await checkAvailability(nameToValidate);
        console.log('Availability result:', result);

        // Handle different response types from different endpoints
        let available: boolean | null = null;
        if (typeof result.available === 'boolean') {
          available = result.available;
        } else if (result.available === '') {
          available = false;
        } else if (result.available === undefined) {
          available = null;
        }

        setValidation({
          available,
          checking: false,
          message: result.message,
        });
      } catch (error) {
        console.error('Validation error:', error);
        setValidation({
          available: false,
          checking: false,
          message: 'Failed to check availability',
        });
      }
    },
    [minLength, checkAvailability],
  );

  // Debounced validation effect
  useEffect(() => {
    if (!name || name.length < minLength) {
      setValidation({ available: null, checking: false, message: '' });
      return;
    }

    // Check format validity immediately
    const formatError = validateNameFormat(name, minLength);
    if (formatError) {
      setValidation({
        available: null,
        checking: false,
        message: formatError,
      });
      return;
    }

    const timer = setTimeout(() => {
      validate(name);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [name, minLength, validate]);

  return validation;
}

const onboardingSchema = z.object({
  orgName: z
    .string()
    .min(3, 'Organization name must be at least 3 characters')
    .max(50, 'Organization name must be less than 50 characters')
    .regex(
      VALIDATION_REGEX,
      'Organization name can only contain lowercase letters, numbers, hyphens, and underscores',
    )
    .transform((val) => val.toLowerCase().trim()),
  webhookName: z
    .string()
    .min(1, 'Webhook name is required')
    .max(50, 'Webhook name must be less than 50 characters')
    .regex(
      VALIDATION_REGEX,
      'Webhook name can only contain lowercase letters, numbers, hyphens, and underscores',
    )
    .transform((val) => val.toLowerCase().trim()),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
  isLoading?: boolean;
  redirectTo?: string;
  source?: string;
}

export function OnboardingForm({
  isLoading = false,
  redirectTo,
  source,
}: OnboardingFormProps) {
  const api = useTRPC();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: activeOrg } = useActiveOrganization();
  const { data: session } = useSession();
  const user = session?.user;

  const form = useForm<OnboardingFormData>({
    defaultValues: {
      orgName: '',
      webhookName: '',
    },
    mode: 'onChange',
    resolver: zodResolver(onboardingSchema),
  });

  const { watch } = form;
  const orgName = watch('orgName');
  const webhookName = watch('webhookName');

  // Use tRPC utils for API calls
  const queryClient = useQueryClient();

  // Validation hooks
  const orgNameValidation = useNameValidation(
    orgName,
    3,
    useCallback(
      (name) =>
        queryClient.fetchQuery(
          api.org.checkNameAvailability.queryOptions({
            excludeOrgId: activeOrg?.id,
            name,
          }),
        ),
      [api, activeOrg?.id, queryClient],
    ),
  );

  // TODO: Re-enable when webhooks are re-implemented
  const webhookNameValidation = {
    available: true,
    checking: false,
    message: '',
  };

  // Live URL preview
  const webhookUrl = (() => {
    const baseUrl =
      env.NEXT_PUBLIC_WEBHOOK_BASE_URL ||
      env.NEXT_PUBLIC_API_URL ||
      'https://seawatts.sh';
    if (!orgName) return `${baseUrl}/{org-name}/{webhook-name}`;
    if (!webhookName) return `${baseUrl}/${orgName}/{webhook-name}`;
    return `${baseUrl}/${orgName}/${webhookName}`;
  })();

  const { mutateAsync: createOrganization } = useMutation(
    api.org.upsert.mutationOptions(),
  );

  const handleSubmit = async (data: OnboardingFormData) => {
    if (!user) {
      toast.error('No user found');
      return;
    }

    // Check validation status before submitting
    if (orgNameValidation.available === false) {
      toast.error('Please fix organization name validation errors');
      return;
    }

    if (webhookNameValidation.available === false) {
      toast.error('Please fix webhook name validation errors');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user already has an organization to prevent duplicate creation
      if (activeOrg) {
        console.log(
          'User already has an organization, preventing duplicate creation:',
          {
            existingOrgId: activeOrg.id,
            existingOrgName: activeOrg.name,
            requestedOrgName: data.orgName,
            userId: user.id,
          },
        );

        // Redirect to webhook creation since organization already exists
        router.push(`/app/webhooks/create?orgName=${data.orgName}`);
        return;
      }

      console.log('Creating new organization for user:', {
        orgName: data.orgName,
        userEmail: user.email,
        userId: user.id,
      });

      // Create organization with Stripe integration
      const orgResult = await createOrganization({
        name: data.orgName,
      });

      if (!orgResult) {
        throw new Error('Failed to create organization');
      }

      console.log('Organization created with Stripe integration:', {
        apiKeyId: orgResult.apiKey?.id,
        orgId: orgResult.org.id,
        orgName: orgResult.org.name,
        stripeCustomerId: orgResult.org.stripeCustomerId,
      });

      // Set the new organization as active via Better Auth
      await fetch('/api/auth/organization/set-active', {
        body: JSON.stringify({ organizationId: orgResult.org.id }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      toast.success('Setup complete!', {
        description:
          'Organization activated and webhook created successfully. Redirecting to your dashboard...',
      });

      // Redirect to local setup page
      const params = new URLSearchParams({
        orgName: data.orgName,
        webhookName: data.webhookName,
      });

      if (redirectTo) {
        params.append('redirectTo', redirectTo);
      }
      if (source) {
        params.append('source', source);
      }

      router.push(`/app/onboarding/local-setup?${params.toString()}`);
    } catch (error) {
      console.error('Failed to complete setup:', error);
      toast.error('Failed to complete setup', {
        description:
          error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to render validation icon
  const renderValidationIcon = (validation: ValidationState) => {
    if (validation.checking) {
      return (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Icons.Spinner className="animate-spin" size="sm" variant="muted" />
        </div>
      );
    }

    if (validation.available === true) {
      return (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Icons.Check className="text-green-500" size="sm" />
        </div>
      );
    }

    if (validation.available === false) {
      return (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Icons.X size="sm" variant="destructive" />
        </div>
      );
    }

    return null;
  };

  // Helper function to get input border classes
  const getInputBorderClasses = (validation: ValidationState) => {
    return cn(
      validation.checking && 'pr-10',
      validation.available === false && 'border-destructive',
      validation.available === true && 'border-green-500',
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to seawatts! 🎉</CardTitle>
          <CardDescription>
            Let's set up your webhook endpoint. Choose names for your
            organization and webhook.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="orgName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="e.g., my-company"
                            {...field}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                            autoFocus
                            autoSave="off"
                            className={getInputBorderClasses(orgNameValidation)}
                            disabled={isSubmitting || isLoading}
                          />
                          {renderValidationIcon(orgNameValidation)}
                        </div>
                      </FormControl>
                      <FormDescription>
                        This will be part of your webhook URL. Use lowercase
                        letters, numbers, and hyphens only.
                      </FormDescription>
                      {orgNameValidation.available === false &&
                        orgNameValidation.message && (
                          <p className="text-sm text-destructive">
                            {orgNameValidation.message}
                          </p>
                        )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhookName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="e.g., my-project"
                            {...field}
                            autoCapitalize="off"
                            autoComplete="off"
                            autoCorrect="off"
                            autoSave="off"
                            className={getInputBorderClasses(
                              webhookNameValidation,
                            )}
                            disabled={isSubmitting || isLoading}
                          />
                          {renderValidationIcon(webhookNameValidation)}
                        </div>
                      </FormControl>
                      <FormDescription>
                        You will use this webhook on a per-project basis. Each
                        project gets its own webhook endpoint that can receive
                        events from multiple services like Stripe, GitHub,
                        Discord, or any webhook provider. Use lowercase letters,
                        numbers, and hyphens only.
                      </FormDescription>
                      {webhookNameValidation.available === false &&
                        webhookNameValidation.message && (
                          <p className="text-sm text-destructive">
                            {webhookNameValidation.message}
                          </p>
                        )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Live URL Preview */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Icons.ExternalLink size="sm" variant="muted" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Your webhook will be available at:
                    </span>
                  </div>
                  <div className="font-mono text-sm text-center p-2 bg-background rounded border">
                    {webhookUrl}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    This URL will be created after you submit the form
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="min-w-32"
                    disabled={
                      isSubmitting ||
                      isLoading ||
                      !orgName ||
                      !webhookName ||
                      orgNameValidation.available === false ||
                      webhookNameValidation.available === false
                    }
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Icons.Spinner
                          className="animate-spin mr-2"
                          size="sm"
                        />
                        Setting up...
                      </>
                    ) : (
                      'Create Webhook'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
