import { createAuthMiddleware } from '@seawatts/auth/middleware';

export default createAuthMiddleware({
  afterSignInUrl: '/app',
  // onNoOrganization: (request) => {
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/app/onboarding';
  //   const redirectTo = request.nextUrl.searchParams.get('redirectTo');
  //   const source = request.nextUrl.searchParams.get('source');

  //   if (redirectTo) {
  //     url.searchParams.set('redirectTo', redirectTo);
  //   }

  //   if (source) {
  //     url.searchParams.set('source', source);
  //   }

  //   return NextResponse.redirect(url);
  // },
  protectedRoutes: ['/app'],
  publicOnlyRoutes: ['/sign-in', '/sign-up'],
  signInUrl: '/sign-in',
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/app(.*)',
  ],
};
