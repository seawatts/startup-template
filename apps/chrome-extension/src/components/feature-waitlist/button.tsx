import logoIcon from 'data-base64:~/../assets/icon.png';
import { useUser } from '@clerk/chrome-extension';
import { Button } from '@seawatts/ui/button';
import { Icons } from '@seawatts/ui/custom/icons';
import { useState } from 'react';

interface FeatureWaitlistButtonProps {
  children?: React.ReactNode;
  featureName: string;
  element: string;
  className?: string;
}

export function FeatureWaitlistButton({
  children,
  // featureName,
  // element,
  className,
}: FeatureWaitlistButtonProps) {
  // const { company } = useCompany();
  const [isSubscribed, _setIsSubscribed] = useState(false);
  const [isPending, _setIsPending] = useState(false);
  const _user = useUser();
  // const joinWaitlist = api.waitlist.join.useMutation();
  // const getWaitlistStatus = api.waitlist.get.useQuery(
  //   { featureName },
  //   { enabled: user.isSignedIn ?? false },
  // );

  // useEffect(() => {
  //   if (getWaitlistStatus.data) {
  //     setIsSubscribed(true);
  //   }
  // }, [getWaitlistStatus.data]);

  // const handleJoinWaitlist = async () => {
  //   if (getWaitlistStatus.data) return;

  //   setIsPending(true);
  //   try {
  //     const currentUrl = new URL(globalThis.location.href);
  //     const searchParams = currentUrl.searchParams;
  //     if (!company?.id) {
  //       throw new Error('Company ID is required');
  //     }

  //     await joinWaitlist.mutateAsync({
  //       companyId: company.id ?? '',
  //       element,
  //       featureName,
  //       url: globalThis.location.href,
  //       utmCampaign: searchParams.get('utm_campaign') ?? undefined,
  //       utmContent: searchParams.get('utm_content') ?? undefined,
  //       utmMedium: searchParams.get('utm_medium') ?? undefined,
  //       utmSource: searchParams.get('utm_source') ?? undefined,
  //       utmTerm: searchParams.get('utm_term') ?? undefined,
  //     });
  //     setIsSubscribed(true);
  //     toast.success('Subscribed to waitlist!');
  //   } catch (error) {
  //     console.error('Failed to join waitlist', error);
  //     toast.error('Failed to join waitlist');
  //   } finally {
  //     setIsPending(false);
  //   }
  // };

  return (
    <Button
      // onClick={handleJoinWaitlist}
      className={className}
      disabled={isPending || isSubscribed}
      type="button"
      variant="outline"
    >
      {isSubscribed && (
        <>
          <Icons.Check className="mr-2" />
          Subscribed
        </>
      )}
      {!isSubscribed && (
        <>
          {isPending ? (
            <Icons.Spinner className="mr-2" />
          ) : (
            <img alt="Acme" className="mb-0.5 mr-2 size-5" src={logoIcon} />
          )}
          {isPending ? 'Joining...' : children || 'Join Waitlist'}
        </>
      )}
    </Button>
  );
}
