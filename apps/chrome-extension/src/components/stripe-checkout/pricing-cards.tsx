import { useUser } from '@clerk/chrome-extension';
import { useMemo } from 'react';

import { api } from '@acme/api/chrome-extension';
import { Badge } from '@acme/ui/badge';
import { Button } from '@acme/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';
import { Icons } from '@acme/ui/icons';

import { useCompany } from '../company/context';
import { useIsPaying } from '../paying/hook';
import { NotPaying } from '../paying/not-paying';

interface PlanFeature {
  name: string;
  comingSoon?: boolean;
  included: boolean;
  details?: string;
}

interface PricingPlan {
  lookupKey:
    | 'FREE_ONE_OFF'
    | 'ACCELERATE_ONE_OFF'
    | 'UNICORN_ONE_OFF'
    | 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF';
  displayName: string;
  price: number;
  features: PlanFeature[];
  buttonText: string;
  buttonVariant: 'outline' | 'default';
}

interface PriceDisplayProps {
  plan: PricingPlan;
  accelerateDiscountPercentage: number;
  unicornDiscountPercentage: number;
  currentPlan?: string | null;
}

function PriceDisplay({
  plan,
  accelerateDiscountPercentage,
  unicornDiscountPercentage,
}: PriceDisplayProps) {
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  });

  if (plan.price === 0) {
    return <div className="text-3xl font-bold">Free</div>;
  }

  const getDiscountPercentage = () => {
    if (plan.lookupKey === 'ACCELERATE_ONE_OFF')
      return accelerateDiscountPercentage;
    if (
      plan.lookupKey === 'UNICORN_ONE_OFF' ||
      plan.lookupKey === 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF'
    ) {
      return unicornDiscountPercentage;
    }
    return 0;
  };

  const discountPercentage = getDiscountPercentage();
  const hasDiscount = discountPercentage > 0;
  const finalPrice = plan.price * (1 - discountPercentage / 100);

  if (plan.lookupKey === 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF') {
    return (
      <div className="flex items-start gap-2">
        <div className="text-3xl font-bold">
          {currencyFormatter.format(finalPrice)}
        </div>
        <Badge>UPGRADE PRICE</Badge>
        <div className="font-semibold text-muted-foreground line-through">
          {currencyFormatter.format(plan.price)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="text-3xl font-bold">
        {currencyFormatter.format(finalPrice)}
      </div>
      {hasDiscount && (
        <>
          <Badge>{`${discountPercentage}% OFF`}</Badge>
          <div className="font-semibold text-muted-foreground line-through">
            {currencyFormatter.format(plan.price)}
          </div>
        </>
      )}
    </div>
  );
}

export function PricingCards() {
  const { company } = useCompany();
  const user = useUser();

  const returnUrl = useMemo(() => {
    const currentUrl = globalThis.location.href;
    return currentUrl.startsWith('chrome-extension://')
      ? 'https://apply.ycombinator.com/app/edit'
      : currentUrl;
  }, []);

  const checkoutSession = api.billing.getCheckoutSession.useQuery(
    {
      cancelUrl: returnUrl,
      companyId: company?.id ?? '',
      successUrl: returnUrl,
    },
    {
      enabled: !!company?.id && (user.isSignedIn ?? false),
    },
  );

  const pricingTableQuery = api.billing.pricingTable.useQuery();

  const accelerateCoupon = api.billing.getCoupon.useQuery(
    { couponId: 'YC_ACCELERATE_DISCOUNT' },
    {
      enabled: user.isSignedIn ?? false,
    },
  );
  const accelerateDiscountPercentage = accelerateCoupon.data?.percent_off || 0;

  const unicornCoupon = api.billing.getCoupon.useQuery(
    { couponId: 'YC_UNICORN_DISCOUNT' },
    {
      enabled: user.isSignedIn ?? false,
    },
  );
  const unicornDiscountPercentage = unicornCoupon.data?.percent_off || 0;

  const {
    isPaying,
    currentPlan,
    isPending: isPayingLoading,
    isSuccess: isPayingSuccess,
  } = useIsPaying();

  const isLoading =
    (isPayingLoading && !isPayingSuccess) || pricingTableQuery.isLoading;

  const filteredPricingPlans = useMemo(() => {
    if (!pricingTableQuery.data) return [];

    const basePlans = pricingTableQuery.data.filter(
      (plan) =>
        plan.lookupKey === 'FREE_ONE_OFF' ||
        plan.lookupKey === 'ACCELERATE_ONE_OFF',
    );

    if (currentPlan === 'ACCELERATE_ONE_OFF') {
      // Show upgrade price for Accelerate users
      const upgradePlan = pricingTableQuery.data.find(
        (p) => p.lookupKey === 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF',
      );
      return upgradePlan ? [...basePlans, upgradePlan] : basePlans;
    }

    // Show regular Unicorn price for others
    const unicornPlan = pricingTableQuery.data.find(
      (p) => p.lookupKey === 'UNICORN_ONE_OFF',
    );
    return unicornPlan ? [...basePlans, unicornPlan] : basePlans;
  }, [pricingTableQuery.data, currentPlan]);

  const renderPlanButton = (plan: PricingPlan) => {
    if (isLoading) {
      return (
        <Button className="w-full" variant="outline">
          <Icons.Spinner className="mr-2" /> Loading...
        </Button>
      );
    }

    if (plan.lookupKey === 'FREE_ONE_OFF') {
      return (
        <NotPaying>
          <Button className="w-full" variant={plan.buttonVariant} asChild>
            <span>{plan.buttonText}</span>
          </Button>
        </NotPaying>
      );
    }

    if (isPaying && currentPlan === plan.lookupKey) {
      return (
        <Button className="w-full cursor-default" variant="outline">
          Current Plan
        </Button>
      );
    }

    if (
      isPaying &&
      currentPlan === 'ACCELERATE_ONE_OFF' &&
      (plan.lookupKey === 'UNICORN_ONE_OFF' ||
        plan.lookupKey === 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF')
    ) {
      return (
        <Button className="w-full" variant={plan.buttonVariant} asChild>
          <a
            href={checkoutSession.data?.[plan.lookupKey] ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            Upgrade to Unicorn
          </a>
        </Button>
      );
    }

    return (
      <NotPaying>
        <Button className="w-full" variant={plan.buttonVariant} asChild>
          <a
            href={checkoutSession.data?.[plan.lookupKey] ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            {plan.buttonText}
          </a>
        </Button>
      </NotPaying>
    );
  };

  if (isLoading || pricingTableQuery.isError) {
    return (
      <div className="flex justify-center">
        <Icons.Spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {filteredPricingPlans.map((plan) => (
        <Card key={plan.lookupKey} className="flex flex-col">
          <CardHeader>
            <CardTitle>{plan.displayName}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="mb-4">
              <PriceDisplay
                plan={plan}
                accelerateDiscountPercentage={accelerateDiscountPercentage}
                unicornDiscountPercentage={unicornDiscountPercentage}
                currentPlan={currentPlan}
              />
            </div>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li
                  key={`${plan.lookupKey}-${feature.name}-${index}`}
                  className="flex items-center"
                >
                  {feature.included ? (
                    <Icons.CheckCircle2
                      className="mr-2 fill-green-500 text-background"
                      size="lg"
                    />
                  ) : (
                    <Icons.XCircle
                      className="mr-2 fill-muted-foreground text-background"
                      size="lg"
                    />
                  )}
                  <span className="text-sm">{feature.name}</span>
                  {feature.comingSoon && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      *
                    </span>
                  )}
                  {feature.details && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({feature.details})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="mt-auto">{renderPlanButton(plan)}</CardFooter>
        </Card>
      ))}
      <div className="text-xs text-muted-foreground">* = coming soon</div>
    </div>
  );
}
