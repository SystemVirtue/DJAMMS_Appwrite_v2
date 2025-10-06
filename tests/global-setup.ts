import { chromium, type FullConfig } from '@playwright/test';
import { writeFileSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('Setting up global test environment...');

  // Start browser for initial setup (used for storageState if needed)
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Use Appwrite credentials from environment (.env)
    const endpoint = process.env.PUBLIC_APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
    const project = process.env.PUBLIC_APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '68cc86c3002b27e13947';
    const apiKey = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || '';
    const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || '';

  // Generate a deterministic RUN_ID for the test run (can be overridden by env)
  const RUN_ID = process.env.TEST_RUN_ID || `${Date.now()}`;
  // Test user and venue identifiers (deterministic based on RUN_ID unless explicitly provided)
  const TEST_USER_ID = process.env.TEST_USER_ID || `test-user-${RUN_ID}`;
  const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'djamms.test+pw@example.com';
  const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'DjammsTest2024!';
  const TEST_VENUE_ID = process.env.TEST_VENUE_ID || `test-venue-${RUN_ID}`;

    // Ensure test user/venue/activity documents exist by invoking the repo script that successfully creates them.
    try {
      console.log('Creating test documents by invoking scripts/create-test-docs.js');
      // Generate a deterministic run id so tests see the same IDs
      const RUN_ID = process.env.TEST_RUN_ID || `${Date.now()}`;
      const env = Object.assign({}, process.env, {
        TEST_USER_ID: TEST_USER_ID,
        TEST_VENUE_ID: TEST_VENUE_ID,
        TEST_RUN_ID: RUN_ID
      });
      const out = execFileSync('node', ['scripts/create-test-docs.js'], { env, encoding: 'utf8' });
      console.log(out);
      // Read back the file the script writes to ensure consistency
      try {
        const s = readFileSync('./tests/.test-env.json', 'utf8');
        console.log('Loaded tests/.test-env.json:', s);
      } catch (e) {
        console.warn('create-test-docs did not write tests/.test-env.json:', e);
      }
    } catch (err: any) {
      console.warn('Creating test documents via script may have failed:', err?.message || err);
    }

    // If the create-test-docs script wrote a .test-env.json, prefer that; otherwise write one.
    try {
      const existing = readFileSync('./tests/.test-env.json', 'utf8');
      console.log('Keeping existing tests/.test-env.json');
    } catch (e) {
      const state = {
        testUserId: TEST_USER_ID,
        testUserEmail: TEST_USER_EMAIL,
        testVenueId: TEST_VENUE_ID,
        appwrite: { endpoint, project, databaseId },
        runId: RUN_ID
      };
      try {
        writeFileSync('./tests/.test-env.json', JSON.stringify(state, null, 2));
        console.log('Wrote tests/.test-env.json');
      } catch (err) {
        console.warn('Could not write tests/.test-env.json', err);
      }
    }

    // Optionally create a Playwright storage state (localStorage) to speed up auth in pages
    try {
      // Create storage state for the local app origin so tests start with an authenticated session
      const appOrigin = process.env.PLAYWRIGHT_APP_ORIGIN || 'http://localhost:5175';
      // Only attempt to create storage state if the app origin is reachable (avoid ERR_CONNECTION_REFUSED)
      let reachable = false;
      try {
        const res = await fetch(appOrigin, { method: 'GET' });
        reachable = res.ok || res.status === 200;
      } catch (e) {
        reachable = false;
      }
      if (!reachable) {
        console.warn('Dev server not reachable at', appOrigin, '- skipping Playwright storage state creation.');
      } else {
        await page.goto(appOrigin);
      // Use the deterministic IDs created by create-test-docs.js (if present)
      let userIdToUse = TEST_USER_ID;
      let venueIdToUse = TEST_VENUE_ID;
      try {
        const env = JSON.parse(readFileSync('./tests/.test-env.json', 'utf8'));
        userIdToUse = env.testUserId || userIdToUse;
        venueIdToUse = env.testVenueId || venueIdToUse;
      } catch (e) {
        // fallback to generated ids
      }

      const init = {
        userId: userIdToUse,
        venueId: venueIdToUse,
        userPayload: { $id: userIdToUse, email: TEST_USER_EMAIL, name: 'Playwright Test User' }
      };
      await page.addInitScript((initSerialized: string) => {
        const initObj = JSON.parse(initSerialized);
        localStorage.setItem('djamms_user_id', initObj.userId);
        localStorage.setItem('djamms_venue_id', initObj.venueId);
        localStorage.setItem('appwrite-session', 'test-session-token');
        localStorage.setItem('appwrite-user', JSON.stringify(initObj.userPayload));
      }, JSON.stringify(init));
      await context.storageState({ path: 'tests/.auth.json' });
      console.log('✅ Created Playwright storage state at tests/.auth.json for', appOrigin);
      }
    } catch (err) {
      console.warn('Could not create storage state:', err);
    }

    console.log('Global setup completed successfully');

  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;