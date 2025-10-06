import { config } from 'dotenv';
import { Client, Databases } from 'node-appwrite';
import fs from 'fs';

config();

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
const project = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

if (!endpoint || !project || !apiKey || !databaseId) {
  console.error('Missing Appwrite environment variables. Check .env');
  process.exit(1);
}

const client = new Client();
client.setEndpoint(endpoint).setProject(project).setKey(apiKey);

const databases = new Databases(client);

async function createDoc(collectionId, docId, data) {
  try {
    await databases.createDocument(databaseId, collectionId, docId, data);
    console.log(`Created document ${docId} in ${collectionId}`);
  } catch (err) {
    if (err && err.code === 409) {
      console.log(`Document ${docId} already exists in ${collectionId}`);
    } else {
      console.warn(`Could not create document in ${collectionId}:`, err?.message || err);
    }
  }
}

(async () => {
  try {
  // Allow passing a TEST_RUN_ID to make generated IDs deterministic for a test run.
  const RUN_ID = process.env.TEST_RUN_ID || `${Date.now()}`;
  const TEST_USER_ID = process.env.TEST_USER_ID || `test-user-${RUN_ID}`;
  const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'djamms.test+pw@example.com';
  const TEST_VENUE_ID = process.env.TEST_VENUE_ID || `test-venue-${RUN_ID}`;

    // Users collection requires `user_id`, `email`, and `created_at`.
    await createDoc('users', TEST_USER_ID, {
      user_id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      username: 'playwright_test_user',
      venue_id: TEST_VENUE_ID,
      role: 'user',
      prefs: JSON.stringify({}),
      created_at: new Date().toISOString()
    });

    // Venues collection requires `venue_id`, `owner_id`, and `created_at`.
    await createDoc('venues', TEST_VENUE_ID, {
      venue_id: TEST_VENUE_ID,
      venue_name: 'Playwright Test Venue',
      owner_id: TEST_USER_ID,
      now_playing: '',
      // The schema stores queues as long strings; store JSON-encoded arrays.
      active_queue: JSON.stringify([]),
      priority_queue: JSON.stringify([]),
      player_settings: JSON.stringify({}),
      created_at: new Date().toISOString()
    });

    // Activity log requires `log_id`, `event_type`, and `timestamp`.
    const ACTIVITY_ID = `activity-${RUN_ID}`;
    await createDoc('activity_log', ACTIVITY_ID, {
      log_id: ACTIVITY_ID,
      user_id: TEST_USER_ID,
      venue_id: TEST_VENUE_ID,
      event_type: 'user_login',
      event_data: JSON.stringify({ user: TEST_USER_ID }),
      timestamp: new Date().toISOString()
    });

    // Also write out a small env file for tests to consume deterministically
    try {
      const state = {
        testUserId: TEST_USER_ID,
        testUserEmail: TEST_USER_EMAIL,
        testVenueId: TEST_VENUE_ID,
        runId: RUN_ID
      };
      fs.writeFileSync('./tests/.test-env.json', JSON.stringify(state, null, 2));
      console.log('Wrote tests/.test-env.json');
    } catch (err) {
      console.warn('Could not write tests/.test-env.json', err);
    }

    console.log('Test documents created (or existed)');
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
})();
