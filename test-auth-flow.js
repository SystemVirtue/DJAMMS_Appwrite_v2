#!/usr/bin/env node

/**
 * Simple authentication and videoplayer test script
 * Tests the authentication flow and logs console errors
 */

import { chromium } from 'playwright';

async function runAuthTest() {
  console.log('🚀 Starting authentication and videoplayer test...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  const consoleLogs = [];

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
    // Step 1: Navigate to homepage
    console.log('📍 Navigating to homepage...');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Check current URL
    const currentURL = page.url();
    console.log(`📍 Current URL: ${currentURL}`);

    // Step 2: Check for authentication state
    if (currentURL.includes('/djamms-dashboard')) {
      console.log('✅ Already authenticated, proceeding to videoplayer...');
    } else {
      // Look for sign-in button
      console.log('🔐 Looking for sign-in button...');
      const signInButton = page.locator('button').filter({
        hasText: /sign in with google|google|login/i
      }).first();

      const buttonVisible = await signInButton.isVisible();
      console.log(`Sign-in button visible: ${buttonVisible}`);

      if (buttonVisible) {
        console.log('🖱️ Found sign-in button, clicking...');
        await signInButton.click();

        // Wait a bit for OAuth redirect
        await page.waitForTimeout(3000);

        const newURL = page.url();
        console.log(`📍 After click URL: ${newURL}`);

        if (newURL.includes('google.com') || newURL.includes('accounts.google.com')) {
          console.log('✅ Redirected to Google OAuth');
          console.log('⚠️ Cannot complete OAuth flow in automated test');
          console.log('🔄 Simulating successful authentication by navigating to dashboard...');

          // Simulate successful auth by going directly to dashboard
          await page.goto('http://localhost:5173/djamms-dashboard');
          await page.waitForLoadState('networkidle');
        }
      } else {
        console.log('⚠️ No sign-in button found, proceeding to dashboard...');
        await page.goto('http://localhost:5173/djamms-dashboard');
        await page.waitForLoadState('networkidle');
      }
    }

    // Step 3: Try to open videoplayer
    console.log('🎬 Attempting to open videoplayer...');

    // Look for videoplayer button/link
    const videoButtons = [
      page.locator('button').filter({ hasText: /video player|videoplayer|player/i }).first(),
      page.locator('a').filter({ hasText: /video player|videoplayer|player/i }).first(),
      page.locator('[data-testid="video-player-button"]').first(),
      page.locator('.video-player-button').first()
    ];

    let videoButtonFound = false;
    for (const button of videoButtons) {
      try {
        if (await button.isVisible({ timeout: 2000 })) {
          console.log('✅ Found videoplayer button, clicking...');
          await button.click();
          videoButtonFound = true;
          break;
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }

    if (!videoButtonFound) {
      console.log('🔗 Videoplayer button not found, navigating directly...');
      await page.goto('http://localhost:5173/videoplayer');
    }

    // Wait for videoplayer to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('✅ Videoplayer navigation completed');

    // Check for video elements
    const videoSelectors = [
      'video',
      'iframe[src*="youtube"]',
      'iframe[src*="youtu.be"]',
      '.video-player',
      '#video-player'
    ];

    let videoFound = false;
    for (const selector of videoSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found video element: ${selector}`);
          videoFound = true;
          break;
        }
      } catch (e) {
        // Continue checking
      }
    }

    if (!videoFound) {
      console.log('⚠️ No video elements found on videoplayer page');
    }

    // Wait a bit more for any async errors
    await page.waitForTimeout(5000);

  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
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

    // Take screenshot
    await page.screenshot({
      path: 'test-results/auth-videoplayer-test.png',
      fullPage: true
    });

    console.log(`📍 Final URL: ${page.url()}`);

    await browser.close();
  }
}

// Run the test
runAuthTest().catch(console.error);