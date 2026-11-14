// The public catalog: every operation an API key can call. One entry here
// reaches REST (`/api/v1/<id>`), the OpenAPI document, the SDK, the CLI's
// `api` command, the MCP server's tools and the API reference in the docs.
// Nothing else is hand-written per interface.
//
// This file is data only (no server imports), so clients and docs pages can
// import it. `id` is the procedure's path in the app router (root.ts);
// tests/operations.test.ts checks every id exists, that `access` matches
// the procedure's GET marker, and that every procedure not listed here is in
// `sessionOnly` with the reason it stays out.

export type Operation = {
  /** The procedure's path in the app router, dot-joined. */
  id: string;
  /** A read changes nothing and may be retried freely. */
  access: 'read' | 'write';
  /** A few words, shown as the tool and reference title. */
  title: string;
  /** One or two sentences a person or a model can choose by. */
  description: string;
  /** A write that removes or cannot be undone; MCP clients confirm it. */
  destructive?: boolean;
};

export const operations = [
  {
    access: 'read',
    description:
      'Returns the organization the API key belongs to: its id, name and subscription status. Use it to check which organization a key acts for.',
    id: 'org.current',
    title: 'Get the organization',
  },
  {
    access: 'write',
    description:
      'Renames the organization. The name is 3 to 50 lowercase letters, numbers or hyphens and must not be taken by another organization.',
    id: 'org.updateName',
    title: 'Rename the organization',
  },
  {
    access: 'read',
    description:
      'Lists the people in the organization with their role and profile.',
    id: 'orgMembers.all',
    title: 'List members',
  },
  {
    access: 'read',
    description:
      'Returns the person who created the API key: the account every call with this key acts as.',
    id: 'user.current',
    title: 'Get the acting person',
  },
  {
    access: 'read',
    description:
      'Returns whether the organization has a subscription and its state (active, trialing, past due or canceled).',
    id: 'billing.getSubscriptionStatus',
    title: 'Get subscription status',
  },
  {
    access: 'read',
    description:
      'Lists the most recent API usage records for the organization, newest first, optionally for one API key. Returns 50 unless `limit` says otherwise (100 at most).',
    id: 'apiKeyUsage.recent',
    title: 'List recent API usage',
  },
  {
    access: 'read',
    description:
      'Counts API usage by type over the last `days` days (30 unless given), optionally for one API key.',
    id: 'apiKeyUsage.stats',
    title: 'Count API usage',
  },
] as const satisfies readonly Operation[];

export type OperationId = (typeof operations)[number]['id'];

// Procedures an API key cannot call, each with the reason. A new procedure
// goes in `operations` or here; the test fails until it is in one of them.
export const sessionOnly: Record<string, string> = {
  'apiKeys.all': 'A key must not read other keys.',
  'apiKeys.allWithLastUsage': 'A key must not read other keys.',
  'apiKeys.byId': 'A key must not read other keys.',
  'apiKeys.create': 'A key must not mint keys.',
  'apiKeys.delete': 'A key must not revoke other keys.',
  'apiKeys.toggleActive': 'A key must not change other keys.',
  'apiKeys.update': 'A key must not change other keys.',
  'apiKeys.updateLastUsed': 'Recorded by the API itself on every call.',
  'apiKeyUsage.all':
    'The app screen; `apiKeyUsage.recent` is the bounded read.',
  'apiKeyUsage.byApiKeyId': 'Covered by `apiKeyUsage.recent` with `apiKeyId`.',
  'apiKeyUsage.byId': 'The app screen; not useful without a list id.',
  'apiKeyUsage.byType': 'Covered by `apiKeyUsage.recent` with `type`.',
  'apiKeyUsage.create': 'Recorded by the API itself on every call.',
  'apiKeyUsage.delete': 'Usage records are an audit trail.',
  'auth.exchangeAuthCode': 'Part of signing a device in.',
  'auth.syncFromProduction': 'Development helper for the mobile app.',
  'auth.verifySessionToken': 'Part of signing a device in.',
  'billing.cancelSubscription': 'A billing decision a signed-in person makes.',
  'billing.createBillingPortalSession': 'Opens a browser page for a person.',
  'billing.createCheckoutSession': 'Opens a browser page for a person.',
  'billing.getBillingDetails': 'Payment details stay in the signed-in app.',
  'billing.getInvoices': 'Payment details stay in the signed-in app.',
  'billing.getSubscriptionDetails':
    'Payment details stay in the signed-in app.',
  'billing.getUsageInfo': 'Payment details stay in the signed-in app.',
  'billing.reactivateSubscription':
    'A billing decision a signed-in person makes.',
  'operator.access': 'The app asks whether to show the Internal link.',
  'operator.organization': 'Staff only, across customers; never by API key.',
  'operator.organizations': 'Staff only, across customers; never by API key.',
  'operator.overview': 'Staff only, across customers; never by API key.',
  'org.checkNameAvailability': 'A form helper for the app.',
  'org.upsert': 'Creating an organization starts from a signed-in person.',
  'user.delete': 'Deleting an account is done by its owner, signed in.',
};
