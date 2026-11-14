'use client';

import posthog from 'posthog-js';
import {
  type ProductEventName,
  type ProductEventProperties,
  productEventProperties,
} from './product-events';

// UI-only moments (opened, copied, switched tab): things no API call
// records. Same catalog and the same property rules as server events.
export function captureBrowserEvent<Name extends ProductEventName>(
  event: Name,
  properties?: ProductEventProperties<Name>,
) {
  try {
    posthog.capture(event, {
      ...productEventProperties(event, properties),
      surface: 'web',
    });
  } catch {
    // Analytics never breaks the screen.
  }
}
