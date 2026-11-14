// Every domain event the app publishes, with what it carries. An event says
// what happened ("an API key's expiry was set"), in the past tense, and
// carries ids and the few facts a handler needs to start; a handler reads
// the current rows itself, because by the time it runs they may have
// changed. Payloads are plain JSON: they cross the workflow queue.
export type DomainEvents = {
  /** A key was created, or its expiry was set, moved or cleared. */
  'apiKey.expirySet': {
    apiKeyId: string;
    organizationId: string;
    /** ISO time, or null when the key no longer expires. */
    expiresAt: string | null;
  };
  /** A key reached its expiry and was switched off. */
  'apiKey.expired': { apiKeyId: string; organizationId: string };
};

export type EventName = keyof DomainEvents;

export type DomainEvent<Name extends EventName = EventName> = {
  [K in Name]: {
    /** Unique per publish: a handler's idempotency key for outside calls. */
    id: string;
    name: K;
    payload: DomainEvents[K];
    publishedAt: string;
  };
}[Name];
