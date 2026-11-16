import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

// The example area's screen at both sizes: empty state, a link made through
// the form, switched off in one click, and the same link read back through
// the public REST API with the person's API key.

const noSidewaysScroll = async (page: Page) =>
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);

// Set E2E_CAPTURE_DIR to save the screen in both themes (pull requests).
async function capture(page: Page, name: string, project: string) {
  const dir = process.env.E2E_CAPTURE_DIR;
  if (!dir) return;
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      localStorage.setItem('theme', value);
      document.documentElement.classList.toggle('dark', value === 'dark');
      document.documentElement.style.colorScheme = value;
    }, theme);
    // Let colour transitions and toasts settle before the picture.
    await page.waitForTimeout(600);
    await page.screenshot({
      fullPage: true,
      path: `${dir}/${name}-${project}-${theme}.png`,
    });
  }
}

test('Links: make a link, switch it off, read it from the API', async ({
  page,
  person,
}, testInfo) => {
  await page.goto('/app/links');
  await expect(page.getByRole('heading', { name: 'Links' })).toBeVisible();
  await expect(page.getByText('No links yet')).toBeVisible();
  await noSidewaysScroll(page);
  await capture(page, 'links-empty', testInfo.project.name);

  const code = `e2e-${Date.now().toString(36)}-${testInfo.project.name}`;
  await page.getByLabel('Destination').fill('https://example.com/launch');
  await page.getByLabel('Code (optional)').fill(code);
  await page.getByRole('button', { name: 'Create link' }).click();
  const row = page.getByTestId('link-row').filter({ hasText: `/s/${code}` });
  await expect(row).toBeVisible();
  await expect(row.getByText('https://example.com/launch')).toBeVisible();

  // The short link sends people on while it is on.
  const on = await page.request.get(`/s/${code}`, { maxRedirects: 0 });
  expect(on.status()).toBe(307);
  expect(on.headers().location).toBe('https://example.com/launch');

  const toggle = row.getByRole('switch');
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(row.getByText('Off')).toBeVisible();
  await noSidewaysScroll(page);
  await capture(page, 'links-list', testInfo.project.name);

  // Same procedures, public interface: REST with the API key.
  const listed = await page.request.post('/api/v1/links.list', {
    data: { limit: 100 },
    headers: { authorization: `Bearer ${person.apiKey}` },
  });
  expect(listed.status()).toBe(200);
  const { data: links } = (await listed.json()) as {
    data: { code: string; isActive: boolean }[];
  };
  expect(links.find((link) => link.code === code)?.isActive).toBe(false);

  // The short link itself answers 404 while it is off.
  const off = await page.request.get(`/s/${code}`, { maxRedirects: 0 });
  expect(off.status()).toBe(404);
});
