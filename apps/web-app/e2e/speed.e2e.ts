import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

// How long a signed-in screen takes to show its content, measured the way a
// person meets it: a full page load with a network round trip in front of
// every request, timed from navigation start to the moment the content is
// drawn. Every API request on the way is listed, so a slow step names
// itself and an extra request is seen.
//
// A measurement, not a check, so it runs only when asked:
//
//   SPEED=enabled bun test:e2e speed --project=desktop
//
// SPEED_RTT    round trip in ms in front of each request (default 60, about
//              a browser to the host)
// SPEED_LOADS  loads per screen; the median is reported (default 5)
// SPEED_CPU    CPU slowdown; 4 is about a mid-range phone (default 1)
// SPEED_BUDGET fail when a screen's median is over this many ms (default:
//              report only)
//
// Run it before and after a change and put both tables in the pull request.

// The screens to time: where to go and what counts as "content shown". Add
// a screen here with the feature that adds it.
const screens: { name: string; path: string; content: string }[] = [
  { content: 'table tbody tr', name: 'API keys', path: '/app/api-keys' },
  {
    content: 'main input',
    name: 'Organization settings',
    path: '/app/settings/organization',
  },
];

const rtt = Number(process.env.SPEED_RTT ?? 60);
const loads = Number(process.env.SPEED_LOADS ?? 5);
const cpu = Number(process.env.SPEED_CPU ?? 1);
const budget = Number(process.env.SPEED_BUDGET ?? 0);

declare global {
  interface Window {
    __contentShown?: number;
  }
}

// Runs in the page before its own scripts: notes the first moment the
// content selector matches something visible.
function watchContent(selector: string) {
  const note = () => {
    if (window.__contentShown) return;
    const found = document.querySelector(selector);
    if (found?.checkVisibility()) {
      // Not while a skeleton stands in for it.
      if (found.closest('[data-slot="skeleton"]')) return;
      if (found.querySelector('[data-slot="skeleton"]')) return;
      window.__contentShown = Math.round(performance.now());
    }
  };
  new MutationObserver(note).observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  document.addEventListener('DOMContentLoaded', note);
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

async function timeLoad(page: Page, path: string) {
  const requests: { name: string; sentAt: number; took: number }[] = [];
  await page.goto(path, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__contentShown, undefined, {
    timeout: 60_000,
  });
  const shown = await page.evaluate(() => window.__contentShown ?? 0);
  // Requests still in flight when the content appeared finish and get listed.
  await page.waitForTimeout(500);
  for (const entry of await page.evaluate(() =>
    performance.getEntriesByType('resource').map((resource) => ({
      duration: Math.round(resource.duration),
      name: resource.name,
      startTime: Math.round(resource.startTime),
    })),
  )) {
    const url = new URL(entry.name);
    if (!url.pathname.startsWith('/api/')) continue;
    requests.push({
      name: url.pathname.replace('/api/rpc/', ''),
      sentAt: entry.startTime,
      took: entry.duration,
    });
  }
  return { requests, shown };
}

test.describe('speed', () => {
  test.skip(
    process.env.SPEED !== 'enabled',
    'a measurement, run on request: SPEED=enabled',
  );
  test.describe.configure({ mode: 'serial' });

  for (const screen of screens)
    test(`${screen.name} shows its content`, async ({ browser, signIn }) => {
      test.setTimeout(5 * 60_000);
      const context = await browser.newContext();
      await signIn(context);
      const page = await context.newPage();
      await page.addInitScript(watchContent, screen.content);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        downloadThroughput: -1,
        latency: rtt,
        offline: false,
        uploadThroughput: -1,
      });
      if (cpu > 1)
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

      // One load to warm the server, not counted.
      await timeLoad(page, screen.path);
      const shown: number[] = [];
      let last: Awaited<ReturnType<typeof timeLoad>> | undefined;
      for (let load = 0; load < loads; load++) {
        last = await timeLoad(page, screen.path);
        shown.push(last.shown);
      }
      const result = median(shown);
      console.log(
        [
          `\n${screen.name} (${screen.path}), ${rtt} ms round trip, CPU x${cpu}`,
          `  content shown: median ${result} ms over ${loads} loads (${shown.join(', ')})`,
          `  API requests in the last load: ${last?.requests.length ?? 0}`,
          ...(last?.requests ?? []).map(
            (request) =>
              `    ${String(request.sentAt).padStart(5)} ms  +${String(request.took).padStart(4)} ms  ${request.name}`,
          ),
        ].join('\n'),
      );
      await context.close();
      if (budget) expect(result).toBeLessThanOrEqual(budget);
    });
});
