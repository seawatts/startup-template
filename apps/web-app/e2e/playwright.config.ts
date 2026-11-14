import { defineConfig, devices } from '@playwright/test';

// Browser tests for the web app. They run against an app that is already
// running (docs/agents/tests.md): build it, start it, then `bun test:e2e`.
// Files end in `.e2e.ts` so `bun test` does not pick them up.
export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  projects: [
    {
      name: 'desktop',
      use: { viewport: { height: 900, width: 1280 } },
    },
    {
      // Chromium at a phone's size: the layout is what is under test.
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        viewport: { height: 844, width: 390 },
      },
    },
  ],
  reporter: [['list']],
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'off',
  },
});
