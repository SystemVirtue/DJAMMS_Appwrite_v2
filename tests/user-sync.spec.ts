import { test, expect } from '@playwright/test';
import { TestHelper } from './test-helpers';

test('admin user-sync endpoint and console/network monitoring', async ({ page }) => {
  const consoleMessages: string[] = [];
  const networkErrors: string[] = [];

  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  // Prepare session/localStorage to avoid full OAuth flow
  await TestHelper.setupAppwriteSession(page);

  // Load base page so the app context is available. Use explicit dev server URL and fail if navigation fails.
  const base = process.env.PW_BASE_URL || 'http://localhost:5173/';
  const nav = await page.goto(base, { waitUntil: 'networkidle', timeout: 15000 }).catch(e => null);
  if (!nav) {
    throw new Error(`Failed to navigate to ${base}. Ensure dev server is running and reachable.`);
  }
  // Wait for basic document elements to be present
  await page.waitForSelector('body', { timeout: 5000 });

  // Call the admin user-sync endpoint from the browser context
  const syncResult = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/admin/user-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'test-admin', userEmail: 'admin@djamms.app' }),
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    } catch (err) {
      return { ok: false, status: 0, text: String(err) };
    }
  });

  console.log('Sync response:', syncResult);

  // Wait a short while for any async logs to appear
  await page.waitForTimeout(1500);

  console.log('Collected console messages:');
  consoleMessages.forEach(m => console.log('  ', m));

  console.log('Collected network errors:');
  networkErrors.forEach(n => console.log('  ', n));

  // Expect the endpoint to not return a 4xx/5xx
  expect(syncResult.status).toBeLessThan(400);
});
