import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@acme/ui/accordion';
import { Button } from '@acme/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@acme/ui/card';
import { Icons } from '@acme/ui/icons';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';

import '../style.css';

import ycCfLogo from 'data-base64:~/../assets/yc-cf-logo.png';

import { CouponDiscountAlert } from '~/components/coupon-discount-alert';
import { Footer } from '~/components/footer';
import { PoweredByLink } from '~/components/powered-by-link';
import { Providers } from '~/providers';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const changelogData: ChangelogEntry[] = [
  {
    changes: [
      'Official release of YC vibe-check Chrome extension',
      'Introduced AI-powered founder video script generation',
      'Upgraded LLM to gpt-4o, gpt-4o-mini, gpt-o1-preview, and claude-3.5-sonnet',
    ],
    date: '2024-10-15',
    version: '1.0.0',
  },
  {
    changes: [
      'Added upload pitch deck functionality',
      'Enhanced user account management',
    ],
    date: '2024-10-10',
    version: '0.4.0',
  },
  {
    changes: [
      'Integrated Stripe for seamless payment processing',
      'Added premium features and payment management',
      'Implemented sign-in functionality for user authentication',
      'Enhanced header component with user profile and navigation',
      'Improved footer with additional links and information',
    ],
    date: '2024-10-07',
    version: '0.3.0',
  },
  {
    changes: [
      'Introduced welcome page for new users',
      'Added changelog page to keep users informed about updates',
      'Implemented AI-powered content suggestions for YC applications',
    ],
    date: '2024-10-04',
    version: '0.2.0',
  },
  {
    changes: [
      'Initial beta release of the YC vibe-check Chrome extension',
      'Basic functionality for interacting with YC application pages',
      'Implemented core UI components and styling',
      'Added integration with acme.ai backend services',
      'Established foundation for future feature development',
    ],
    date: '2024-10-01',
    version: '0.1.0',
  },
];

function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-base text-foreground antialiased">
      <div className="mx-auto flex w-full max-w-3xl flex-grow flex-col gap-4 p-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex flex-col gap-2">
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <img
                    alt="YC vibe-check"
                    className="h-16 w-auto"
                    src={ycCfLogo}
                  />
                  <div className="flex flex-col gap-2">
                    <span>YC vibe-check - Changelog</span>
                    <div className="text-sm text-muted-foreground">
                      Stay up to date with our latest features and improvements
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <PoweredByLink />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between">
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  chrome.tabs.create({
                    url: './tabs/welcome.html',
                  });
                }}
                variant="outline"
              >
                <Icons.Bookmark className="mr-2" />
                Tutorial
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://apply.ycombinator.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icons.Plus className="mr-2" />
                  New YC App
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href="https://apply.ycombinator.com/app/edit"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icons.Pencil className="mr-2" />
                  Open YC App
                </a>
              </Button>
            </div>
            <Button asChild variant="outline">
              <a href="mailto:vibes@acme.ai">
                <Icons.Mail className="mr-2" />
                Contact Support
              </a>
            </Button>
          </CardContent>
        </Card>

        <CouponDiscountAlert />
        <Accordion
          className="w-full"
          defaultValue={changelogData.map((entry) => entry.version)}
          type="multiple"
        >
          {changelogData.map((entry) => {
            const parsedDate = parseISO(entry.date);
            const isValidDate = isValid(parsedDate);

            return (
              <AccordionItem key={entry.version} value={entry.version}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col items-start">
                      <span>Version {entry.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {isValidDate
                          ? formatDistanceToNow(parsedDate, { addSuffix: true })
                          : 'Invalid date'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {/* {isValidDate
                        ? format(parsedDate, "MM/dd/yyyy")
                        : "Invalid date"} */}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="ml-4 mt-2 list-inside list-disc space-y-2 text-muted-foreground">
                    {entry.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <div className="mt-12">
        <Footer />
      </div>
    </div>
  );
}

export default function ChangelogWrapper() {
  return (
    <Providers>
      <ChangelogPage />
    </Providers>
  );
}
