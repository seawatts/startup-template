'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useTRPC } from '@seawatts/api/react';
import { useHasActiveSubscription } from '@seawatts/stripe/guards/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@seawatts/ui/card';
import { Icons } from '@seawatts/ui/custom/icons';
import { P } from '@seawatts/ui/custom/typography';
import { IconAlertTriangle, IconCheck, IconRefresh } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function SubscriptionManagementSection() {
  const api = useTRPC();
  const hasActiveSubscription = useHasActiveSubscription();

  // Get subscription details
  const { data: subscriptionDetails, isLoading: isLoadingDetails } = useQuery(
    api.billing.getSubscriptionDetails.queryOptions(undefined, {
      enabled: hasActiveSubscription,
    }),
  );

  // Get subscription status
  const { refetch: refetchStatus } = useQuery(
    api.billing.getSubscriptionStatus.queryOptions(),
  );

  // Mutations for subscription management
  const { mutate: cancelSubscription, isPending: isCanceling } = useMutation(
    api.billing.cancelSubscription.mutationOptions({
      onError: (error) => {
        toast.error(`Failed to cancel subscription: ${error.message}`);
      },
      onSuccess: () => {
        toast.success(
          'Subscription will be canceled at the end of the current period',
        );
        refetchStatus();
      },
    }),
  );

  const { mutate: reactivateSubscription, isPending: isReactivating } =
    useMutation(
      api.billing.reactivateSubscription.mutationOptions({
        onError: (error) => {
          toast.error(`Failed to reactivate subscription: ${error.message}`);
        },
        onSuccess: () => {
          toast.success('Subscription has been reactivated');
          refetchStatus();
        },
      }),
    );

  const handleCancelSubscription = () => {
    if (
      confirm(
        'Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.',
      )
    ) {
      cancelSubscription();
    }
  };

  const handleReactivateSubscription = () => {
    reactivateSubscription();
  };

  if (!hasActiveSubscription) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Management</CardTitle>
        <CardDescription>
          Manage your subscription settings and billing cycle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingDetails ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </div>
        ) : subscriptionDetails ? (
          <div className="space-y-4">
            {/* Subscription Status */}
            <div className="flex items-center justify-between">
              <div>
                <P className="font-medium">Status</P>
                <P className="text-sm text-muted-foreground capitalize">
                  {subscriptionDetails.status}
                </P>
              </div>
              <div className="flex items-center gap-2">
                {subscriptionDetails.cancelAtPeriodEnd ? (
                  <IconAlertTriangle className="size-4 text-warning" />
                ) : (
                  <IconCheck className="size-4 text-green-600" />
                )}
              </div>
            </div>

            {/* Billing Period */}
            {subscriptionDetails.trialStart && subscriptionDetails.trialEnd && (
              <div>
                <P className="font-medium">Trial Period</P>
                <P className="text-sm text-muted-foreground">
                  {new Date(
                    subscriptionDetails.trialStart * 1000,
                  ).toLocaleDateString()}{' '}
                  -{' '}
                  {new Date(
                    subscriptionDetails.trialEnd * 1000,
                  ).toLocaleDateString()}
                </P>
              </div>
            )}

            {/* Subscription Items */}
            <div>
              <P className="font-medium">Plan Details</P>
              <div className="mt-2 space-y-2">
                {subscriptionDetails.items.map((item) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={item.id}
                  >
                    <span>
                      {item.price.unitAmount
                        ? `$${(item.price.unitAmount / 100).toFixed(2)}`
                        : 'Usage-based'}{' '}
                      per {item.price.recurring?.interval || 'period'}
                    </span>
                    <span className="text-muted-foreground">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              {subscriptionDetails.cancelAtPeriodEnd ? (
                <MetricButton
                  disabled={isReactivating}
                  metric="subscription_management_reactivate_clicked"
                  onClick={handleReactivateSubscription}
                  variant="outline"
                >
                  <IconRefresh
                    className={`mr-2 size-4 ${isReactivating ? 'animate-spin' : ''}`}
                  />
                  {isReactivating
                    ? 'Reactivating...'
                    : 'Reactivate Subscription'}
                </MetricButton>
              ) : (
                <MetricButton
                  disabled={isCanceling}
                  metric="subscription_management_cancel_clicked"
                  onClick={handleCancelSubscription}
                  variant="outline"
                >
                  <Icons.X className="mr-2 size-4" />
                  {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
                </MetricButton>
              )}
            </div>

            {subscriptionDetails.cancelAtPeriodEnd && (
              <P className="text-sm text-muted-foreground">
                Your subscription will be canceled at the end of the current
                billing period. You can reactivate it anytime before then.
              </P>
            )}
          </div>
        ) : (
          <P className="text-sm text-muted-foreground">
            Unable to load subscription details.
          </P>
        )}
      </CardContent>
    </Card>
  );
}
