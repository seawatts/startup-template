import { expect } from '@playwright/test';
import { test } from './fixtures';

// The signed-in app at both sizes: the screen shows its content, nothing
// scrolls sideways, and a page meant for operators does not exist for
// anyone else.

test('API keys shows its content without sideways scroll', async ({
  page,
  person,
}) => {
  await page.goto('/app/api-keys');
  await expect(page.getByText('API Keys').first()).toBeVisible();
  // The frame is drawn at once; the table fills in when its read answers.
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
  expect(person.organizationId).toContain('org_e2e_');
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Internal does not exist for someone who is not an operator', async ({
  page,
  person,
}) => {
  await page.goto('/app/internal');
  await expect(page.getByText('Include internal')).toHaveCount(0);
  const read = await page.request.get(
    `/api/rpc/operator/overview?data=${encodeURIComponent('{"json":{}}')}`,
  );
  expect(read.status()).toBe(404);
  expect(person.userId).toContain('user_e2e_');
});
