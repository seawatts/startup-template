import type { Instrumentation } from 'next';

export async function register() {
  // Published domain events are delivered to the event workflow
  // (docs/agents/events.md). Node only: workflows do not start from the edge.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const [{ deliverEventsWith }, { deliverEvent }] = await Promise.all([
    import('@seawatts/api/events/publish'),
    import('./server/event-delivery'),
  ]);
  deliverEventsWith(deliverEvent);
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { posthog } = await import('@seawatts/analytics/posthog/server');
    let distinctId = null;

    if (request.headers.cookie) {
      const cookieString = request.headers.cookie as string;
      const postHogCookieMatch = cookieString.match(
        /ph_phc_.*?_posthog=([^;]+)/,
      );

      if (postHogCookieMatch?.[1]) {
        try {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
          const postHogData = JSON.parse(decodedCookie);
          distinctId = postHogData.distinct_id;
        } catch (e) {
          console.error('Error parsing PostHog cookie:', e);
        }
      }
    }

    posthog.captureException(err, distinctId || undefined);
  }
};
