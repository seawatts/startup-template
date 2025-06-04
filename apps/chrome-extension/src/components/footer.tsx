import { Icons } from '@acme/ui/icons';

import { PoweredByLink } from './powered-by-link';

export function Footer() {
  const footerNavs = [
    // {
    //   label: "Product",
    //   items: [
    //     { name: "Pricing", href: "#" },
    //     { name: "FAQ", href: "#" },
    //   ],
    // },
    {
      items: [
        { href: 'https://x.com/TheCoFounderAI', name: 'X' },
        {
          href: 'https://www.linkedin.com/company/cofounder-ai',
          name: 'LinkedIn',
        },
      ],
      label: 'Community',
    },
    {
      items: [
        { href: '#', name: 'Terms' },
        { href: '#', name: 'Privacy' },
      ],
      label: 'Legal',
    },
  ];

  const footerSocials = [
    {
      href: 'https://www.linkedin.com/company/cofounder-ai',
      icon: <Icons.LinkedIn className="h-4 w-4" />,
      name: 'LinkedIn',
    },
    {
      href: 'https://x.com/TheCoFounderAI',
      icon: <Icons.TwitterX size="sm" />,
      name: 'X',
    },
  ];

  return (
    <footer className="border-t border-border pt-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <PoweredByLink />
            </div>
            <p className="text-sm text-muted-foreground">
              The Fundraising Platform for Founders
            </p>
          </div>
          <div className="flex gap-8 sm:gap-12">
            {footerNavs.map((nav) => (
              <div key={nav.label}>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-tighter">
                  {nav.label}
                </h2>
                <ul className="grid gap-2">
                  {nav.items.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            {footerSocials.map((social) => (
              <a
                key={social.name}
                href={social.href}
                className="text-muted-foreground hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                {social.icon}
                <span className="sr-only">{social.name}</span>
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-right text-sm text-muted-foreground">
            <span>
              Copyright © {new Date().getFullYear()} CoFounder, Inc. All Rights
              Reserved.
            </span>
            <span>
              YC vibe-check is not affiliated with, endorsed by, or sponsored by
              Y Combinator.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
