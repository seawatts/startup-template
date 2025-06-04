import { differenceInDays, fromUnixTime } from 'date-fns';

import { api } from '@acme/api/chrome-extension';
import { Alert, AlertDescription, AlertTitle } from '@acme/ui/alert';
import { Icons } from '@acme/ui/icons';

import { CompanyCreated } from './company/company-created';
import { NotPaying } from './paying/not-paying';
import { ReferDialogButton } from './refer-dialog/button';
import { StripeCheckoutButton } from './stripe-checkout/button';

function getDaysLeft(redeemBy: number): number {
  const today = new Date();
  const end = fromUnixTime(redeemBy);
  const daysLeft = differenceInDays(end, today);
  return Math.max(0, daysLeft);
}

export function CouponDiscountAlert({
  withCheckoutButton = true,
  withCheckoutButtonIcon = true,
}: {
  withCheckoutButton?: boolean;
  withCheckoutButtonIcon?: boolean;
}) {
  const coupon = api.billing.getCoupon.useQuery({
    couponId: 'YC_UNICORN_DISCOUNT',
  });
  const latestCohort = api.investmentFirm.latestCohort.useQuery({
    lookupKey: 'ycombinator',
  });

  const daysLeft = latestCohort.data?.deadline
    ? getDaysLeft(latestCohort.data.deadline.getTime() / 1000)
    : 0;

  if (daysLeft <= 0) return null;

  const cohort = latestCohort.data?.shortName;

  const hoursLeft = latestCohort.data?.deadline
    ? (latestCohort.data.deadline.getTime() - Date.now()) / (1000 * 60 * 60)
    : 0;

  let timeLeftText = '';
  if (hoursLeft < 12) {
    timeLeftText = `Only ${Math.ceil(hoursLeft)} ${Math.ceil(hoursLeft) === 1 ? 'hour' : 'hours'} left!`;
  } else if (hoursLeft < 24) {
    timeLeftText = 'Last day left!';
  } else {
    timeLeftText = `Only ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left!`;
  }

  return (
    <CompanyCreated>
      <NotPaying>
        <Alert>
          <div className="flex items-start gap-4">
            <Icons.Info />
            <div className="flex flex-grow justify-between gap-4">
              <div className="flex-grow">
                <AlertTitle>
                  YC vibe-check{' '}
                  <span className="font-semibold">{`${coupon.data?.percent_off ?? 0}% off`}</span>{' '}
                  - {timeLeftText}
                </AlertTitle>
                <AlertDescription>
                  Discount for YC{' '}
                  <span className="font-semibold">{cohort}</span> applicants.
                  Don't miss out the deadline!
                </AlertDescription>
              </div>
              <div className="flex flex-col-reverse flex-wrap gap-2">
                <ReferDialogButton />
                {withCheckoutButton && (
                  <StripeCheckoutButton withIcon={withCheckoutButtonIcon}>
                    Get Your Discount
                  </StripeCheckoutButton>
                )}
              </div>
            </div>
          </div>
        </Alert>
      </NotPaying>
    </CompanyCreated>
  );
}
