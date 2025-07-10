'use client';

import { Icons } from '@acme/ui/custom/icons';
import { cn } from '@acme/ui/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarTrigger,
} from '@acme/ui/sidebar';
import {
  BookOpen,
  Code,
  ExternalLink,
  LayoutDashboard,
  Logs,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { UserDropdownMenu } from './user-dropdown-menu';

const pagesWithSecondarySidebar = ['/settings'];

export function AppSidebar({
  orgId,
  userId,
}: {
  orgId?: string;
  userId: string;
}) {
  const pathname = usePathname();

  // Menu items.
  const monitoringItems = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      url: `/${orgId}/${userId}/dashboard`,
    },
    {
      icon: Logs,
      title: 'Logs',
      url: `/${orgId}/${userId}/logs`,
    },
  ];

  const isLoading = !userId;
  // I don't love this, but it's a quick way to check if we're on the settings page which has it's own sidebar.
  const hasSecondarySidebar = pagesWithSecondarySidebar.some((page) =>
    pathname.includes(page),
  );

  return (
    <Sidebar
      className={cn({
        'mt-2 pb-4 pr-4 ml-2': hasSecondarySidebar, // NOTE: This is a hack to get the sidebar to fit the design.
      })}
      collapsible="icon"
      variant={hasSecondarySidebar ? undefined : 'inset'}
    >
      <SidebarHeader className="flex-row items-gap-1">
        <SidebarTrigger className="h-8 w-8" />
        <div className="flex-1 group-data-[collapsible=icon]:hidden">
          {!isLoading && <UserDropdownMenu />}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Monitor</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading
                ? ['skeleton-1', 'skeleton-2', 'skeleton-3'].map((id) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuSkeleton showIcon />
                    </SidebarMenuItem>
                  ))
                : monitoringItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.url === pathname}
                      >
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* <SidebarGroup>
          <SidebarGroupLabel>Develop</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading
                ? ['skeleton-1', 'skeleton-2', 'skeleton-3'].map((id) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuSkeleton showIcon />
                    </SidebarMenuItem>
                  ))
                : developmentItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.url === pathname}
                      >
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                className="flex items-center justify-between"
                href="https://docs.acme.com"
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  <span>Docs</span>
                </span>
                <ExternalLink className="size-4" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                className="flex items-center justify-between"
                href="https://docs.acme.com/ref/overview"
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex items-center gap-2">
                  <Code className="size-4 shrink-0" />
                  <span>API Reference</span>
                </span>
                <ExternalLink className="size-4" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                className="flex items-center justify-between"
                href="https://discord.gg/BTNBeXGuaS"
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex items-center gap-2">
                  <Icons.Discord className="size-4" />
                  <span>Discord</span>
                </span>
                <ExternalLink className="size-4" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                className="flex items-center justify-between"
                href="https://github.com/acme-ai/acme/blob/canary/CHANGELOG.md"
                rel="noreferrer"
                target="_blank"
              >
                <span className="flex items-center gap-2">
                  <Icons.Rocket className="size-4" />
                  <span>Changelog</span>
                </span>
                <ExternalLink className="size-4" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
