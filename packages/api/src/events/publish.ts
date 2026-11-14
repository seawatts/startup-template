import { createId } from '@seawatts/id';
import type { DomainEvent, DomainEvents, EventName } from './catalog';

// A save says what happened and nothing more. Who reacts is decided in one
// place (the app's event map), and the reactions run as durable workflow
// steps, so they retry and their failures are visible, instead of running
// inline in the save or being discovered later by a page load or a sweep.
//
// Publish after the write has committed: after `inTransaction` returns, never
// inside its callback. An event for a write that rolled back would start
// work on rows that do not exist.

type Deliver = (event: DomainEvent) => Promise<void>;

// The app hands events to its workflow (apps/web-app/src/server/
// event-delivery.ts, registered in instrumentation.ts). Kept on globalThis
// because the bundler may load this module once per route.
const slot = globalThis as typeof globalThis & {
  __deliverDomainEvent?: Deliver;
  __undeliveredDomainEvents?: DomainEvent[];
};

export function deliverEventsWith(deliver: Deliver) {
  slot.__deliverDomainEvent = deliver;
}

/**
 * Events published where nothing delivers them (tests, scripts), oldest
 * first; reading them empties the list.
 */
export function takeUndeliveredEvents() {
  const events = slot.__undeliveredDomainEvents ?? [];
  slot.__undeliveredDomainEvents = [];
  return events;
}

export async function publishEvent<Name extends EventName>(
  name: Name,
  payload: DomainEvents[Name],
) {
  const event = {
    id: createId({ prefix: 'evt' }),
    name,
    payload,
    publishedAt: new Date().toISOString(),
  } as DomainEvent;
  const deliver = slot.__deliverDomainEvent;
  if (!deliver) {
    slot.__undeliveredDomainEvents = [
      ...(slot.__undeliveredDomainEvents ?? []),
      event,
    ];
    return;
  }
  try {
    // Awaited: this is the hand-off to the queue, one short request. The
    // save has already committed, so a failed hand-off is reported, not
    // thrown at a caller whose change did happen.
    await deliver(event);
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        event: 'domain_event_undelivered',
        id: event.id,
        name,
      }),
    );
  }
}
