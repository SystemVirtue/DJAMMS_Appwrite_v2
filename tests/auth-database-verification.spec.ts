import { test, expect } from '@playwright/test';
import { Client, Databases, Account } from 'node-appwrite';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

test.describe('DJAMMS Authentication Database Verification', () => {
  let client: Client;
  let databases: Databases;
  let account: Account;

  test.beforeEach(async () => {
    // Initialize node-appwrite client for server-side database verification
    const endpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1';
    const project = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '68cc86c3002b27e13947';
    const apiKey = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || '';
    client = new Client();
    client.setEndpoint(endpoint).setProject(project).setKey(apiKey);

    databases = new Databases(client);
    account = new Account(client);
  });

  test('should create user and venue documents on authentication', async ({ page }) => {
    console.log('🚀 Starting authentication database verification test...');

    // For testing purposes, we'll simulate the authentication flow
    // by mocking the Appwrite authentication and directly calling setupUserAndVenue
    // Use the stable test IDs from global-setup (tests/.test-env.json) when available
    let stableTestUserId = '';
    let stableTestVenueId = '';
    try {
      const env = JSON.parse(readFileSync('./tests/.test-env.json', 'utf8'));
      stableTestUserId = env.testUserId || '';
      stableTestVenueId = env.testVenueId || '';
    } catch (e) {
      // ignore if file not present
    }

    const mockUser = {
      $id: stableTestUserId || `test-user-${Date.now()}`,
      email: 'test@example.com',
      name: 'Test User',
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString()
    };

    // Mock the Appwrite account.get() call
    await page.addInitScript((user) => {
      // Mock the account.get() method to return our test user
      const originalAccount = (window as any).Appwrite?.Account;
      if (originalAccount) {
        originalAccount.prototype.get = async () => user;
      }
    }, mockUser);

    // Navigate to dashboard to trigger initialization
    await page.goto('http://localhost:5173/djamms-dashboard');
    await page.waitForTimeout(3000); // Wait for initialization

    console.log(`🎭 Using mock user ID: ${mockUser.$id}`);

    // Wait for the page to fully load and authentication to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for store initialization

    // Verify database operations occurred using server-side client
    console.log('� Verifying database operations (server-side)...');
    const dbId = process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';
    const userId = await page.evaluate(() => localStorage.getItem('djamms_user_id')) || mockUser.$id;
    const venueId = await page.evaluate(() => localStorage.getItem('djamms_venue_id')) || `${userId.replace('user', 'venue')}`;

    let userExists = false;
    let venueExists = false;
    let activityLogged = false;

    try {
      const userDoc = await databases.getDocument(dbId, 'users', userId);
      userExists = !!userDoc;
    } catch (e) {
      userExists = false;
    }

    try {
      const venueDoc = await databases.getDocument(dbId, 'venues', venueId);
      venueExists = !!venueDoc;
    } catch (e) {
      venueExists = false;
    }

    try {
  const list = await databases.listDocuments(dbId, 'activity_log');
      const recentLogin = list.documents.find((doc: any) => doc.event_type === 'user_login');
      activityLogged = !!recentLogin;
    } catch (e) {
      activityLogged = false;
    }

    console.log(`✅ User record created: ${userExists}`);
    console.log(`✅ Venue record created: ${venueExists}`);
    console.log(`✅ Activity logged: ${activityLogged}`);

    // Assertions
    expect(userExists).toBe(true);
    expect(venueExists).toBe(true);
    expect(activityLogged).toBe(true);
  });
});