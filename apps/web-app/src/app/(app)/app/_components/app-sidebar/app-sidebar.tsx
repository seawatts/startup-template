'use client';

import { MetricLink } from '@seawatts/analytics';
import { useORPC } from '@seawatts/api/react/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@seawatts/ui/sidebar';
import {
  IconBrandGithub,
  IconCamera,
  IconCodeDots,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconKey,
  IconLink,
  IconReport,
  IconSettings,
  IconShieldLock,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import type * as React from 'react';
import { Icons } from '~/app/(marketing)/_components/icons';
import { NavMain } from './nav-main';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';
import { UsageCard } from './usage-card';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith('/app/onboarding');
  // Operators get a link to Internal. The pages and their reads check the
  // operator again on the server.
  const api = useORPC();
  const operator = useQuery(
    api.operator.access.queryOptions({ staleTime: Number.POSITIVE_INFINITY }),
  ).data?.operator;

  const data = {
    documents: [
      {
        icon: IconDatabase,
        name: 'Data Library',
        url: '#',
      },
      {
        icon: IconReport,
        name: 'Reports',
        url: '#',
      },
      {
        icon: IconFileWord,
        name: 'Word Assistant',
        url: '#',
      },
    ],
    navClouds: [
      {
        icon: IconCamera,
        isActive: true,
        items: [
          {
            title: 'Active Proposals',
            url: '#',
          },
          {
            title: 'Archived',
            url: '#',
          },
        ],
        title: 'Capture',
        url: '#',
      },
      {
        icon: IconFileDescription,
        items: [
          {
            title: 'Active Proposals',
            url: '#',
          },
          {
            title: 'Archived',
            url: '#',
          },
        ],
        title: 'Proposal',
        url: '#',
      },
      {
        icon: IconFileAi,
        items: [
          {
            title: 'Active Proposals',
            url: '#',
          },
          {
            title: 'Archived',
            url: '#',
          },
        ],
        title: 'Prompts',
        url: '#',
      },
    ],
    navMain: [
      {
        icon: IconDashboard,
        title: 'Dashboard',
        url: '/app/dashboard',
      },
      // {
      //   icon: IconWebhook,
      //   title: 'Webhooks',
      //   url: '/app/webhooks',
      // },
      {
        icon: IconDatabase,
        title: 'Events',
        url: '/app/events',
      },
      // {
      //   icon: IconPlayerPlay,
      //   title: 'Playground',
      //   url: '/app/playground',
      // },
      {
        icon: IconLink,
        title: 'Links',
        url: '/app/links',
      },
      {
        icon: IconKey,
        title: 'API Keys',
        url: '/app/api-keys',
      },
      {
        icon: IconSettings,
        title: 'Settings',
        url: '/app/settings/organization',
      },
      ...(operator
        ? [{ icon: IconShieldLock, title: 'Internal', url: '/app/internal' }]
        : []),
    ],
    navSecondary: [
      {
        icon: IconBrandGithub,
        title: 'GitHub',
        url: 'https://github.com/seawatts-sh/seawatts',
      },
      {
        icon: IconCodeDots,
        title: 'Docs',
        url: 'https://docs.seawatts.sh',
      },
      // {
      //   icon: IconSearch,
      //   title: 'Search',
      //   url: '#',
      // },
    ],
    user: {
      avatar: '/avatars/shadcn.jpg',
      email: 'm@example.com',
      name: 'shadcn',
    },
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <MetricLink
                href={isOnboarding ? '/app/onboarding' : '/app/dashboard'}
                metric="navigation_logo_clicked"
              >
                <Icons.logo className="size-10" />
                <span className="text-base font-semibold">seawatts AI</span>
              </MetricLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {!isOnboarding && <NavMain items={data.navMain} />}
        {/* <NavDocuments items={data.documents} /> */}
        <div className="mt-auto">
          {!isOnboarding && <UsageCard />}
          <NavSecondary items={data.navSecondary} />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
