import '~/utils/sentry';

import cssText from 'data-text:~/style.css';
import { SignedIn } from '@clerk/chrome-extension';
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from 'plasmo';

import { CreateCompanyCard } from '~/components/company/card';
import { CompanyCreated } from '~/components/company/company-created';
import { CompetitorsCard } from '~/components/competitors/card';
import { FieldWatcher } from '~/components/field-watcher';
import { WelcomeCard } from '~/components/header/card';
import { PitchPracticeCard } from '~/components/pitch-practice/card';
import { ShareLinkCard } from '~/components/share-link/card';
import { SyncYcApp } from '~/components/sync-yc-app';
import { Providers } from '~/providers';

export const config: PlasmoCSConfig = {
  matches: ['https://apply.ycombinator.com/apps/*'],
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

export const getShadowHostId = () => 'plasmo-inline-header-id';

const Content = () => {
  return (
    <div className="mx-auto mt-4 w-full max-w-[1200px]">
      <div className="flex flex-col gap-4 px-6 md:ml-12">
        <WelcomeCard />

        <SignedIn>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CreateCompanyCard />
            <CompanyCreated>
              <PitchPracticeCard />
              <ShareLinkCard />
              <CompetitorsCard />
              <FieldWatcher fetchOnLoad />
              <SyncYcApp />
            </CompanyCreated>
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
