import { expect, test } from 'bun:test';

// The webhook check has to work on the Bun runtime, where Stripe's sync
// `constructEvent` throws. A signed payload verifies; a tampered one does not.
process.env.CI ??= 'true';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

test('a signed webhook verifies, a tampered one is refused', async () => {
  const [{ constructWebhookEvent }, { default: Stripe }] = await Promise.all([
    import('../src/index'),
    import('stripe'),
  ]);
  const payload = JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type: 'ping',
  });
  const signature = await new Stripe(
    'sk_test_dummy',
  ).webhooks.generateTestHeaderStringAsync({
    payload,
    secret: 'whsec_test_secret',
  });
  const event = await constructWebhookEvent(payload, signature);
  expect(event.id).toBe('evt_1');
  expect(
    await constructWebhookEvent(`${payload} `, signature).then(
      () => 'accepted',
      () => 'refused',
    ),
  ).toBe('refused');
});
