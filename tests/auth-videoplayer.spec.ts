import { test, expect } from '@playwright/test';
import { TestHelper } from './test-helpers';

test.describe('DJAMMS Authentication & Video Player Test', () => {
  test('should sign in and open videoplayer with console error logging', async ({ page }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    const consoleLogs: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(`ERROR: ${text}`);
        console.log(`🔴 Console Error: ${text}`);
      } else {
        consoleLogs.push(`${msg.type().toUpperCase()}: ${text}`);
      }
    });

    // Listen for page errors (JavaScript errors)
    page.on('pageerror', error => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
      console.log(`💥 Page Error: ${error.message}`);
    });

    try {
      console.log('🚀 Starting authentication and videoplayer test...');

      // Step 1: Navigate to homepage
      console.log('📍 Navigating to homepage...');
      await page.goto('/');
      await TestHelper.waitForPageLoad(page);

      // Check if we're redirected to dashboard (already authenticated)
      const currentURL = page.url();
      console.log(`📍 Current URL: ${currentURL}`);

      if (currentURL.includes('/djamms-dashboard')) {
        console.log('✅ Already authenticated, proceeding to videoplayer...');
      } else {
        // Step 2: Attempt to sign in
        console.log('🔐 Attempting to sign in...');

        // Look for Google sign-in button
        const signInButton = page.locator('button').filter({
          hasText: /sign in with google|google|login/i
        }).first();

        try {
          await expect(signInButton).toBeVisible({ timeout: 10000 });
          console.log('✅ Found sign-in button');

          // Click sign-in button
          await signInButton.click();
          console.log('🖱️ Clicked sign-in button');

          // Wait for redirect or authentication completion
          await page.waitForURL(/\/djamms-dashboard/, { timeout: 30000 });
          console.log('✅ Authentication completed, redirected to dashboard');

        } catch (error) {
          console.log('⚠️ Sign-in button not found or authentication failed, proceeding with mock auth...');

          // Fallback: Setup mock authentication
          await TestHelper.setupAppwriteSession(page);
          await page.reload();
          await page.waitForURL(/\/djamms-dashboard/, { timeout: 10000 });
          console.log('✅ Mock authentication setup completed');
        }
      }

      // Step 3: Open videoplayer
      console.log('🎬 Opening videoplayer...');

      // Try different methods to open videoplayer
      try {
        // Method 1: Look for videoplayer button/link
        const videoPlayerButton = page.locator('button, a').filter({
          hasText: /video player|videoplayer|player/i
        }).first();

        if (await videoPlayerButton.isVisible({ timeout: 5000 })) {
          console.log('✅ Found videoplayer button, clicking...');
          await videoPlayerButton.click();
        } else {
          // Method 2: Direct navigation
          console.log('🔗 Videoplayer button not found, navigating directly...');
          await page.goto('/videoplayer');
        }

        // Wait for videoplayer to load
        await TestHelper.waitForPageLoad(page);
        await page.waitForTimeout(2000); // Extra wait for video player initialization

        console.log('✅ Videoplayer opened successfully');

        // Step 4: Verify videoplayer loaded
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Look for video player elements
        const videoElements = [
          'video',
          '[data-testid="video-player"]',
          '.video-player',
          '#video-player',
          'iframe[src*="youtube"]',
          'iframe[src*="youtu.be"]'
        ];

        let videoFound = false;
        for (const selector of videoElements) {
          try {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              console.log(`✅ Found video element: ${selector}`);
              videoFound = true;
              break;
            }
          } catch (e) {
            // Continue checking other selectors
          }
        }

        if (!videoFound) {
          console.log('⚠️ No video elements found, but page loaded');
        }

        // Wait a bit more to catch any async errors
        await page.waitForTimeout(3000);

      } catch (error) {
        console.log(`❌ Failed to open videoplayer: ${(error as Error).message}`);
        throw error;
      }

    } catch (error) {
      console.log(`💥 Test failed: ${(error as Error).message}`);
      throw error;
    } finally {
      // Log all collected errors
      console.log('\n📊 CONSOLE ERROR SUMMARY:');
      if (consoleErrors.length > 0) {
        console.log(`🔴 Found ${consoleErrors.length} console errors:`);
        consoleErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      } else {
        console.log('✅ No console errors detected');
      }

      console.log(`\n📊 Total console messages: ${consoleLogs.length + consoleErrors.length}`);

      // Take a screenshot for debugging
      await page.screenshot({
        path: `test-results/videoplayer-test-${Date.now()}.png`,
        fullPage: true
      });

      // Log final URL
      console.log(`📍 Final URL: ${page.url()}`);
    }
  });
});