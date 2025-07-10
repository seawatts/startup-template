import { useMemo } from 'react';
import { useAuthStore } from '~/stores/auth-store';
import { useCliStore } from '~/stores/cli-store';
import type { Route } from '~/stores/router-store';
import { DebugPage } from './debug/page';
import { HotkeysPage } from './hotkeys/page';
import { LoginLayout } from './login/layout';
import { LogoutPage } from './logout/page';
import { MenuLayout } from './menu/layout';
import { NotFoundPage } from './not-found/page';
import { QuitPage } from './quit/page';
import { UnauthorizedPage } from './unauthorized/page';

export type AppRoutePath =
  | '/'
  | '/login'
  | '/logout'
  | '/unauthorized'
  | '/docs'
  | '/not-found'
  | '/report-issue'
  | '/quit'
  | '/settings'
  | '/status'
  | '/metrics'
  | '/debug'
  | '/hotkeys'
  | '/help'
  | '/init'
  | '/listen';

// Type for static routes (no parameters)
export type StaticAppRoutePath = Exclude<AppRoutePath, `${string}:${string}`>;

export type AppRoute = Route<AppRoutePath>;

export function useRoutes() {
  const isSignedIn = useAuthStore.use.isSignedIn();
  const isDebug = useCliStore.use.verbose?.();

  return useMemo(() => {
    const authenticatedRoutes: AppRoute[] = [
      {
        component: LogoutPage,
        hotkey: 'l',
        label: 'Logout',
        path: '/logout',
      },
      {
        component: () => null,
        label: 'Listen for Changes',
        path: '/listen',
      },
    ];

    const debugRoute: AppRoute = {
      component: DebugPage,
      hotkey: 'd',
      label: 'Debug Info',
      path: '/debug',
    };

    const unauthenticatedRoutes: AppRoute[] = [
      {
        component: LoginLayout,
        hotkey: 'l',
        label: 'Login',
        path: '/login',
      },
    ];

    const commonRoutes: AppRoute[] = [
      {
        component: MenuLayout,
        label: 'Menu',
        path: '/',
        showInMenu: false,
      },
      {
        component: () => null,
        label: 'Initialize Project',
        path: '/init',
      },
      {
        component: HotkeysPage,
        hotkey: '?',
        label: 'Hotkeys',
        path: '/hotkeys',
        showInMenu: false,
      },
      {
        component: () => null,
        hotkey: 'h',
        label: 'Help',
        path: '/help',
      },
      {
        component: () => null,
        hotkey: 'i',
        label: 'Report Issue',
        path: '/report-issue',
        url: 'https://github.com/acme-sh/acme/issues/new?template=bug_report.yml',
      },
      {
        component: () => null,
        hotkey: 'd',
        label: 'Docs',
        path: '/docs',
        url: 'https://docs.acme.sh',
      },
      {
        component: QuitPage,
        hotkey: 'q',
        label: 'Quit',
        path: '/quit',
      },
      {
        component: UnauthorizedPage,
        label: 'Unauthorized',
        path: '/unauthorized',
        showInMenu: false,
      },
      {
        component: NotFoundPage,
        label: 'Not Found',
        path: '/not-found',
        showInMenu: false,
      },
    ];

    return [
      ...(isSignedIn ? authenticatedRoutes : unauthenticatedRoutes),
      ...(isSignedIn && isDebug ? [debugRoute] : []),
      ...commonRoutes,
    ];
  }, [isSignedIn, isDebug]);
}
