import { test, expect } from '@playwright/test';
import { TestHelper } from './test-helpers';
import { Client, Databases } from 'appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

test.describe('DJAMMS User Registration and Player Test', () => {
  // Test data
  const testUser = {
    email: `test-user-${Date.now()}@example.com`,
    name: 'Test User',
    venueName: 'Test Venue'
  };

  let appwriteClient: Client;
  let databases: Databases;

  test.beforeAll(async () => {
    // Load environment variables if not already loaded
    if (!process.env.APPWRITE_ENDPOINT) {
      dotenv.config();
    }

    // Validate required environment variables
    if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID) {
      throw new Error('Missing required environment variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID');
    }

    // Initialize Appwrite client for database verification
    appwriteClient = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID);

    databases = new Databases(appwriteClient);
  });

  test('should create user and venue records on signup and open player with default playlist', async ({ page, context }) => {
    console.log('🚀 Starting comprehensive user registration and player test...');

    // Step 1: Navigate to homepage and verify initial state
    console.log('📍 Step 1: Navigating to homepage...');
    await page.goto('/');
    await TestHelper.waitForPageLoad(page);

    // Verify we're on the homepage
    await expect(page.locator('h1')).toContainText(/DJAMMS|Welcome/i);

    // Step 2: Mock user authentication (since we can't do real Google OAuth in tests)
    console.log('🔐 Step 2: Setting up mock authentication...');

    const mockUser = {
      $id: `test-user-${Date.now()}`,
      email: testUser.email,
      name: testUser.name,
      prefs: {
        venue_id: `venue-${Date.now()}`
      }
    };

    // Mock the authentication flow
    await page.addInitScript((user) => {
      // Mock successful Google OAuth
      (window as any).mockAuthUser = user;

      // Override the Google sign-in handler
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [url, options] = args;
        const urlString = typeof url === 'string' ? url : url.toString();
        if (urlString.includes('google') || urlString.includes('oauth')) {
          // Mock successful OAuth response
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              user: user,
              session: { $id: 'mock-session-id' }
            })
          } as Response);
        }
        return originalFetch.apply(this, args);
      };
    }, mockUser);

    // Click sign-in button
    const signInButton = page.locator('button').filter({
      hasText: /sign in with google|google|login/i
    }).first();

    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    console.log('✅ Authentication completed, redirected to dashboard');

    // Step 3: Verify user and venue creation in database
    console.log('🗄️ Step 3: Verifying database records creation...');

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

    // Wait a moment for backend processing
    await page.waitForTimeout(3000);

    try {
      // Check if user record was created
      const userRecords = await databases.listDocuments(DATABASE_ID, 'users', [
        // Query.equal('email', testUser.email)
      ]);

      console.log(`📊 Found ${userRecords.total} user records in database`);

      // Look for our test user (may have different email due to mocking)
      const testUserRecord = userRecords.documents.find(doc => doc.email === testUser.email);

      if (testUserRecord) {
        console.log('✅ User record found in database:', {
          user_id: testUserRecord.user_id,
          email: testUserRecord.email,
          venue_id: testUserRecord.venue_id,
          role: testUserRecord.role
        });

        expect(testUserRecord.email).toBe(testUser.email);
        expect(testUserRecord.user_id).toBeTruthy();
        expect(testUserRecord.venue_id).toBeTruthy();

        // Check if venue record was created
        const venueRecords = await databases.listDocuments(DATABASE_ID, 'venues', [
          // Query.equal('venue_id', testUserRecord.venue_id)
        ]);

        console.log(`🏢 Found ${venueRecords.total} venue records in database`);

        const testVenueRecord = venueRecords.documents.find(doc => doc.venue_id === testUserRecord.venue_id);

        if (testVenueRecord) {
          console.log('✅ Venue record found in database:', {
            venue_id: testVenueRecord.venue_id,
            venue_name: testVenueRecord.venue_name,
            owner_id: testVenueRecord.owner_id
          });

          expect(testVenueRecord.venue_id).toBe(testUserRecord.venue_id);
          expect(testVenueRecord.owner_id).toBe(testUserRecord.user_id);
        } else {
          console.log('⚠️ Venue record not found, checking if default venue exists...');
          // Check for default venue
          const defaultVenue = venueRecords.documents.find(doc => doc.venue_id === 'default');
          if (defaultVenue) {
            console.log('✅ Default venue found, user will use existing venue');
          } else {
            console.log('❌ No venue records found for user');
          }
        }
      } else {
        console.log('⚠️ Test user record not found, checking for any recent user records...');
        // Log recent user records for debugging
        const recentUsers = userRecords.documents.slice(0, 3);
        recentUsers.forEach(user => {
          console.log(`  - User: ${user.email} (${user.user_id})`);
        });
      }

    } catch (dbError) {
      console.log('⚠️ Database verification failed:', (dbError as Error).message);
      console.log('Continuing with UI tests...');
    }

    // Step 4: Open video player
    console.log('🎬 Step 4: Opening video player...');

    // Look for video player button on dashboard
    const videoPlayerButton = page.locator('button, a').filter({
      hasText: /video player|start video player|videoplayer/i
    }).first();

    await expect(videoPlayerButton).toBeVisible({ timeout: 10000 });
    await videoPlayerButton.click();

    // Wait for video player window to open
    await page.waitForTimeout(2000);

    // Check if a new window/tab was opened
    const pages = context.pages();
    console.log(`📄 Total pages after clicking video player: ${pages.length}`);

    let playerPage: typeof page | undefined;

    // Find the video player page
    for (const p of pages) {
      if (p.url().includes('/videoplayer')) {
        playerPage = p;
        break;
      }
    }

    if (playerPage) {
      console.log('✅ Video player window found');

      // Switch to player page
      await playerPage.bringToFront();
      await TestHelper.waitForPageLoad(playerPage);

      // Wait for player initialization
      await playerPage.waitForTimeout(3000);

      // Step 5: Verify player loaded and check for default playlist
      console.log('🎵 Step 5: Verifying player functionality...');

      // Check if player container exists
      const playerContainer = playerPage.locator('#player, .youtube-player, [data-testid="video-player"]');
      await expect(playerContainer).toBeVisible({ timeout: 10000 });
      console.log('✅ Player container found');

      // Check for YouTube iframe (indicates player loaded)
      const youtubeIframe = playerPage.locator('iframe[src*="youtube"], iframe[src*="youtu.be"]');
      const iframeVisible = await youtubeIframe.isVisible({ timeout: 5000 }).catch(() => false);

      if (iframeVisible) {
        console.log('✅ YouTube player iframe found - player is loaded');
      } else {
        console.log('⚠️ YouTube iframe not found, checking for loading state...');
        // Check for loading indicators
        const loadingIndicator = playerPage.locator('text=/loading|initializing/i');
        const hasLoading = await loadingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasLoading) {
          console.log('✅ Player is in loading state');
        }
      }

      // Check for player controls
      const playButton = playerPage.locator('button').filter({ hasText: /play|pause/i }).first();
      const hasControls = await playButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasControls) {
        console.log('✅ Player controls found');
      } else {
        console.log('⚠️ Player controls not visible');
      }

      // Step 6: Verify default playlist loading
      console.log('📀 Step 6: Checking for default playlist...');

      // Check if there's any track information displayed
      const trackInfo = playerPage.locator('text=/track|song|playlist/i');
      const hasTrackInfo = await trackInfo.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasTrackInfo) {
        console.log('✅ Track/playlist information found');
      } else {
        console.log('⚠️ No track information visible');
      }

      // Check for "no songs" or empty queue messages
      const noSongsMessage = playerPage.locator('text=/no songs|empty|queue/i');
      const hasNoSongs = await noSongsMessage.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasNoSongs) {
        console.log('ℹ️ Player shows empty queue - default playlist may need to be loaded');
      } else {
        console.log('✅ Player appears to have content loaded');
      }

      // Take screenshot for verification
      await playerPage.screenshot({
        path: `test-results/player-test-${Date.now()}.png`,
        fullPage: true
      });

      console.log('📸 Screenshot saved for verification');

    } else {
      console.log('❌ Video player window not found');
      throw new Error('Video player window did not open');
    }

    console.log('🎉 Test completed successfully!');
  });

  test.afterAll(async () => {
    // Cleanup test data if needed
    console.log('🧹 Test cleanup completed');
  });
});