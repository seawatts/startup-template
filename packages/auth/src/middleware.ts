import { type NextRequest, NextResponse } from 'next/server';
import { auth } from './server';

export interface AuthMiddlewareOptions {
  /**
   * Routes that require authentication
   */
  protectedRoutes?: string[];
  /**
   * Routes that should redirect to app if authenticated
   */
  publicOnlyRoutes?: string[];
  /**
   * Where to redirect unauthenticated users
   */
  signInUrl?: string;
  /**
   * Where to redirect authenticated users from public-only routes
   */
  afterSignInUrl?: string;
  /**
   * Callback when user is authenticated but has no organization
   */
  onNoOrganization?: (request: NextRequest) => NextResponse | null;
}

const defaultOptions: AuthMiddlewareOptions = {
  afterSignInUrl: '/app',
  protectedRoutes: ['/app'],
  publicOnlyRoutes: ['/sign-in', '/sign-up'],
  signInUrl: '/sign-in',
};

/**
 * Get the session from the request
 */
export async function getSessionFromRequest(request: NextRequest) {
  const sessionCookie = request.cookies.get('better-auth.session_token')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return session;
  } catch {
    return null;
  }
}

/**
 * Check if a path matches any of the given patterns
 */
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  });
}

/**
 * Create an auth middleware for Next.js
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return async function authMiddleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and API routes (except auth)
    if (
      pathname.startsWith('/_next') ||
      (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    const session = await getSessionFromRequest(request);
    const isAuthenticated = !!session?.user;
    const isProtectedRoute = matchesPath(pathname, opts.protectedRoutes ?? []);
    const isPublicOnlyRoute = matchesPath(
      pathname,
      opts.publicOnlyRoutes ?? [],
    );

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !isAuthenticated) {
      const signInUrl = new URL(opts.signInUrl ?? '/sign-in', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Redirect authenticated users from public-only routes
    if (isPublicOnlyRoute && isAuthenticated) {
      return NextResponse.redirect(
        new URL(opts.afterSignInUrl ?? '/app', request.url),
      );
    }

    // Check for organization on protected routes
    if (isProtectedRoute && isAuthenticated && opts.onNoOrganization) {
      // The session from Better Auth organization plugin includes activeOrganization
      const hasOrganization = !!(session as { activeOrganizationId?: string })
        ?.activeOrganizationId;

      if (!hasOrganization && !pathname.startsWith('/app/onboarding')) {
        const response = opts.onNoOrganization(request);
        if (response) return response;
      }
    }

    return NextResponse.next();
  };
}

/**
 * Helper to get auth headers for server-side requests
 */
export function getAuthHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.set('cookie', cookie);
  }
  return headers;
}
