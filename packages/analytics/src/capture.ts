import { waitUntil } from '@vercel/functions';
import {
  type ProductEventName,
  type ProductEventProperties,
  type ProductSurface,
  productEventProperties,
} from './product-events';

// Server-side product events. Capture after the action has committed.
// Sending is best effort: it never throws, never delays the response (the
// send is kept alive past it with `waitUntil`) and does nothing when PostHog
// is not configured.

export type ProductEvent<Name extends ProductEventName = ProductEventName> = {
  event: Name;
  /** Opaque ids only. With neither, the event is anonymous. */
  userId?: string | null;
  organizationId?: string | null;
  surface: ProductSurface;
  properties?: ProductEventProperties<Name>;
  /** The same key makes PostHog keep one copy of a retried event. */
  dedupeKey?: string;
};

type Sent = {
  distinctId: string;
  event: ProductEventName;
  groups?: { organization: string };
  properties: Record<string, unknown>;
  uuid?: string;
};
type Sink = (event: Sent) => void | Promise<void>;

// Tests replace the sender to see what would be sent.
let sink: Sink | null = null;
export function sendProductEventsTo(next: Sink | null) {
  sink = next;
}

async function send(event: Sent) {
  if (sink) return sink(event);
  if (!process.env.POSTHOG_KEY || !process.env.POSTHOG_HOST) return;
  // Loaded on first use: most requests capture nothing.
  const { posthog } = await import('./posthog/server');
  await posthog.captureImmediate(event);
}

export function captureProductEvent<Name extends ProductEventName>(
  input: ProductEvent<Name>,
) {
  const sent: Sent = {
    distinctId:
      input.userId ??
      (input.organizationId ? `org:${input.organizationId}` : 'anonymous'),
    event: input.event,
    ...(input.organizationId
      ? { groups: { organization: input.organizationId } }
      : {}),
    properties: {
      ...productEventProperties(input.event, input.properties),
      surface: input.surface,
      // An event with no person behind it creates no person profile.
      ...(input.userId ? {} : { $process_person_profile: false }),
    },
    ...(input.dedupeKey ? { uuid: dedupeUuid(input.dedupeKey) } : {}),
  };
  const done = Promise.resolve()
    .then(() => send(sent))
    .catch((error) => {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          event: 'product_event_unsent',
          name: input.event,
        }),
      );
    });
  waitUntil(done);
  return done;
}

// A stable UUID-shaped id from a key, so a retry sends the same one.
function dedupeUuid(key: string) {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let index = 0; index < key.length; index++) {
    const code = key.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b + code, 0x85ebca6b) >>> 0;
  }
  const hex = [a, b, a ^ b, Math.imul(a, b) >>> 0]
    .map((part) => (part >>> 0).toString(16).padStart(8, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
