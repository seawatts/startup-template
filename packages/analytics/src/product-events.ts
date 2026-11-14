// The catalog of product events: what a person or an API key did, by name,
// with the only properties each may carry. Properties are opaque ids, enums,
// counts and booleans. Never content, names, emails or free text: the
// catalog drops any property not listed here and any value that is not a
// boolean, a number or a short identifier-like string.
//
// Names are `object_verbed`, in the past tense, and stay stable: dashboards
// are built on them.
export const productEvents = {
  api_key_created: ['has_expiry'],
  api_key_deleted: [],
  api_key_updated: ['expiry_changed', 'active'],
  // Browser-only moments (captureBrowserEvent).
  api_key_visibility_toggled: ['visible'],
  billing_portal_opened: [],
  checkout_started: [],
  organization_created: [],
  organization_renamed: [],
  subscription_canceled: [],
  subscription_reactivated: [],
} as const satisfies Record<string, readonly string[]>;

export type ProductEventName = keyof typeof productEvents;
export type ProductEventProperties<Name extends ProductEventName> = Partial<
  Record<(typeof productEvents)[Name][number], boolean | number | string>
>;

/** Where the action came from. */
export type ProductSurface = 'web' | 'api' | 'workflow';

const identifierLike = /^[a-z0-9_.:-]{1,64}$/i;

/** Only the allowlisted properties, and only safe kinds of value. */
export function productEventProperties(
  event: ProductEventName,
  properties: Record<string, unknown> = {},
) {
  const allowed: readonly string[] = productEvents[event];
  const kept: Record<string, boolean | number | string> = {};
  for (const [name, value] of Object.entries(properties)) {
    if (!allowed.includes(name)) continue;
    if (typeof value === 'boolean' || typeof value === 'number')
      kept[name] = value;
    else if (typeof value === 'string' && identifierLike.test(value))
      kept[name] = value;
  }
  return kept;
}
