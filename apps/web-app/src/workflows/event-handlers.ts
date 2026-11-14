import type { DomainEvent, EventName } from '@seawatts/api/events/catalog';

// The one map from each event to what reacts to it. To see everything that
// happens after a save, read the event's row here; to add a reaction, add a
// named handler to it. A handler:
//
// - runs as its own workflow step (workflows/events.ts), so it is retried on
//   its own and a failure names it;
// - is idempotent: a retry or a duplicate event changes nothing. Make the
//   write conditional or unique on a natural key (subject + kind + period),
//   and pass `event.id` as the idempotency key to outside services;
// - reads the rows as they are now, not as the event described them.
//
// Keep the bodies thin: the logic lives in a service in packages/api and is
// loaded inside the handler, so starting a workflow loads only what it runs.

type Handlers = {
  [Name in EventName]: Record<
    string,
    (event: DomainEvent<Name>) => Promise<unknown>
  >;
};

export const eventHandlers: Handlers = {
  // Nothing reacts yet. Publishing it costs nothing until something does.
  'apiKey.expired': {},
  'apiKey.expirySet': {
    scheduleExpiry: async (event) => {
      if (!event.payload.expiresAt) return { scheduled: false };
      const [{ start }, { apiKeyExpiryWorkflow }] = await Promise.all([
        import('workflow/api'),
        import('./api-key-expiry'),
      ]);
      const run = await start(apiKeyExpiryWorkflow, [event.payload.apiKeyId]);
      return { runId: run.runId, scheduled: true };
    },
  },
};

export const handlerNames = (name: EventName) =>
  Object.keys(eventHandlers[name]);
