import type { DomainEvent } from '@seawatts/api/events/catalog';

// One run per published event: each handler the map lists for it runs as a
// step of its own, side by side. A handler that fails is retried without
// rerunning the ones that finished.

async function handle(event: DomainEvent, handler: string) {
  'use step';
  const { eventHandlers } = await import('./event-handlers');
  const run = (
    eventHandlers[event.name] as Record<
      string,
      (event: DomainEvent) => Promise<unknown>
    >
  )[handler];
  // A handler removed by a newer release: nothing left to do for it.
  if (!run) return { handler, skipped: true };
  await run(event);
  return { handler };
}

export async function eventWorkflow(event: DomainEvent, handlers: string[]) {
  'use workflow';
  await Promise.all(handlers.map((handler) => handle(event, handler)));
  return { event: event.name, handled: handlers };
}
