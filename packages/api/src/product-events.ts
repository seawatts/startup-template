import type { ProductEventName } from '@seawatts/analytics/product-events';

// The product event each save records when it succeeds. Every procedure that
// is not a GET must appear here, with its event or with `null` and the
// reason it is not product usage; tests/product-events.test.ts fails
// otherwise, so a new save cannot ship unseen. The app, the REST API, the
// SDK, the CLI and MCP all run through these procedures, so one entry covers
// every way in.
//
// `properties` reads only booleans, counts and enums from the input or the
// result. The catalog drops anything else, but never pass free text here in
// the first place.

type Tracked = {
  event: ProductEventName;
  properties?: (
    input: Record<string, unknown>,
    output: unknown,
  ) => Record<string, unknown>;
};
type Untracked = { event: null; reason: string };

export const productEventFor: Record<string, Tracked | Untracked> = {
  'apiKeys.create': {
    event: 'api_key_created',
    properties: (input) => ({ has_expiry: input.expiresAt != null }),
  },
  'apiKeys.delete': { event: 'api_key_deleted' },
  'apiKeys.toggleActive': {
    event: 'api_key_updated',
    properties: (_input, output) => ({
      active: (output as { isActive?: boolean } | undefined)?.isActive,
    }),
  },
  'apiKeys.update': {
    event: 'api_key_updated',
    properties: (input) => ({ expiry_changed: input.expiresAt !== undefined }),
  },
  'apiKeys.updateLastUsed': {
    event: null,
    reason: 'A record of a request, not something a person did.',
  },
  'apiKeyUsage.create': {
    event: null,
    reason: 'A record of a request, not something a person did.',
  },
  'apiKeyUsage.delete': { event: null, reason: 'Housekeeping.' },
  'auth.createAuthCode': {
    event: null,
    reason: 'Sign-in is recorded by the auth routes.',
  },
  'auth.exchangeAuthCode': {
    event: null,
    reason: 'Sign-in is recorded by the auth routes.',
  },
  'auth.syncFromProduction': { event: null, reason: 'Development helper.' },
  'billing.cancelSubscription': { event: 'subscription_canceled' },
  'billing.createBillingPortalSession': { event: 'billing_portal_opened' },
  'billing.createCheckoutSession': { event: 'checkout_started' },
  'billing.reactivateSubscription': { event: 'subscription_reactivated' },
  'links.create': {
    event: 'link_created',
    properties: (input) => ({ custom_code: input.code != null }),
  },
  'links.delete': { event: 'link_deleted' },
  'links.setActive': {
    event: 'link_updated',
    properties: (input) => ({ active: input.active }),
  },
  'org.delete': { event: 'organization_deleted' },
  'org.updateName': { event: 'organization_renamed' },
  'org.upsert': { event: 'organization_created' },
  'orgMembers.invite': {
    event: 'member_invited',
    properties: (input) => ({ role: input.role }),
  },
  'orgMembers.leave': { event: 'organization_left' },
  'orgMembers.remove': { event: 'member_removed' },
  'orgMembers.updateRole': {
    event: 'member_role_changed',
    properties: (input) => ({ role: input.role }),
  },
  'user.delete': {
    event: null,
    reason: 'The account is gone; nothing may be tied to it afterwards.',
  },
};
