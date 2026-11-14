import { sleep } from 'workflow';

// One workflow per key with an expiry: it sleeps until the key is due,
// switches it off and ends. No cron scans every key every minute to find the
// few that are due.
//
// On waking it reads the key again. The expiry may have moved later (sleep
// again), been cleared, or the key may be gone (end). A move starts a second
// workflow for the same key; both read the current row and the switch-off
// only matches a key that is still on and due, so the extra one finds
// nothing to do.

async function expireIfDue(apiKeyId: string) {
  'use step';
  const { expireApiKeyIfDue } = await import(
    '@seawatts/api/services/api-key-expiry'
  );
  const result = await expireApiKeyIfDue(apiKeyId);
  if (result.status === 'expired') {
    const { publishEvent } = await import('@seawatts/api/events/publish');
    await publishEvent('apiKey.expired', {
      apiKeyId,
      organizationId: result.organizationId,
    });
  }
  return result;
}

export async function apiKeyExpiryWorkflow(apiKeyId: string) {
  'use workflow';
  // Bounded: an expiry that keeps moving ends this run, and the move's own
  // event has already started another.
  for (let wake = 0; wake < 50; wake++) {
    const result = await expireIfDue(apiKeyId);
    if (result.status !== 'waiting') return result;
    await sleep(new Date(result.until));
  }
  return { status: 'nothing_due' as const };
}
