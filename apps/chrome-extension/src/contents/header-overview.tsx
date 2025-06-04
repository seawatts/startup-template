import cssText from 'data-text:~/style.css';
import { SignedIn } from '@clerk/chrome-extension';
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from 'plasmo';

import { ComingSoonCard } from '~/components/coming-soon-card';
import { GetStartedCard } from '~/components/get-started-card';
import { WelcomeCard } from '~/components/header/card';
import { SyncYcDashboard } from '~/components/sync-yc-dashboard';
import { Providers } from '~/providers';

export const config: PlasmoCSConfig = {
  exclude_matches: [
    'https://apply.ycombinator.com/app/edit/*',
    'https://apply.ycombinator.com/bio/edit/*',
    'https://apply.ycombinator.com/apps/*',
    'https://apply.ycombinator.com/session/new/*',
    'https://apply.ycombinator.com/session/new?*',
  ],
  matches: ['https://apply.ycombinator.com/*'],
};

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText.replaceAll(':root', ':host(plasmo-csui)');
  return style;
};

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  const element = document.querySelector(
    '[data-react-class="components/Header"]',
  );
  if (!element) throw new Error('Header element not found');
  return element;
};

export const getShadowHostId = () => 'plasmo-inline-header-overview-id';

const Content = () => {
  return (
    <div className="mx-auto mt-4 w-full max-w-[1200px]">
      <div className="flex flex-col px-6">
        <WelcomeCard />

        <SignedIn>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <GetStartedCard />
            <ComingSoonCard />
            <SyncYcDashboard />
          </div>
        </SignedIn>
      </div>
    </div>
  );
};

export default function ContentWrapper() {
  return (
    <Providers>
      <Content />
    </Providers>
  );
}
