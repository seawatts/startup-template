import 'server-only';
import type { DomainEvent } from '@seawatts/api/events/catalog';
import { start } from 'workflow/api';
import { handlerNames } from '~/workflows/event-handlers';
import { eventWorkflow } from '~/workflows/events';

// How a published event leaves the request: one workflow run that carries
// the event and the handlers the map lists for it right now.
export async function deliverEvent(event: DomainEvent) {
  const handlers = handlerNames(event.name);
  if (handlers.length === 0) return;
  await start(eventWorkflow, [event, handlers]);
}
