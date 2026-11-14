import { sleep } from 'workflow';

// One chain of runs per key with an expiry: a run sleeps until the key is
// due, switches it off and ends. No cron scans every key every minute to
// find the few that are due.
//
// - On waking it reads the key again: the expiry may have been cleared or
//   the key may be gone (end).
// - The expiry it was scheduled for is its token. A save that moves the
//   expiry starts a new chain for the new time; this one sees a different
//   expiry on the key and stops, so one chain per key stays alive.
// - A run stays on the release that started it, so none sleeps longer than
//   a week. If the key is still waiting when it wakes, it starts the next
//   run on the latest release and ends. The workflow's name, file and
//   arguments are that hand-over's contract: change them like an API.

type Step =
  | { status: 'expired'; organizationId: string }
  | { status: 'nothing_due' }
  | { status: 'replaced' }
  | { status: 'waiting'; wakeAt: string };

async function expireIfDue(
  apiKeyId: string,
  scheduledFor: string,
): Promise<Step> {
  'use step';
  const { expireApiKeyIfDue, nextExpiryWake } = await import(
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
  if (result.status !== 'waiting') return result;
  const next = nextExpiryWake(result.until, scheduledFor);
  return next.replaced
    ? { status: 'replaced' }
    : { status: 'waiting', wakeAt: next.wakeAt };
}

async function handOver(apiKeyId: string, scheduledFor: string) {
  'use step';
  const { start } = await import('workflow/api');
  const run = await start(apiKeyExpiryWorkflow, [apiKeyId, scheduledFor], {
    deploymentId: 'latest',
  });
  return { runId: run.runId, status: 'handed_over' as const };
}

export async function apiKeyExpiryWorkflow(
  apiKeyId: string,
  scheduledFor: string,
): Promise<Step | { status: 'handed_over'; runId: string }> {
  'use workflow';
  const first = await expireIfDue(apiKeyId, scheduledFor);
  if (first.status !== 'waiting') return first;
  await sleep(new Date(first.wakeAt));
  const woke = await expireIfDue(apiKeyId, scheduledFor);
  if (woke.status !== 'waiting') return woke;
  return handOver(apiKeyId, scheduledFor);
}
