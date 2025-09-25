import { test, expect } from '@playwright/test';
import { TestHelper } from './test-helpers';

test.describe('DJAMMS Smoke Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads without major errors
    await expect(page).toHaveTitle(/DJAMMS|Digital Jukebox/i);
    
    // Look for basic navigation or content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should navigate to dashboard after authentication', async ({ page }) => {
    // Setup mock session to bypass actual Google auth
    await TestHelper.setupAppwriteSession(page);
    
    await page.goto('/dashboard');
    await TestHelper.waitForPageLoad(page);
    
    // Should see dashboard content
    const heading = page.locator('h1, h2, [role="heading"]').first();
    await expect(heading).toBeVisible();
  });

  test('should access video player page', async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    
    await page.goto('/videoplayer');
    await TestHelper.waitForPageLoad(page);
    
    // Page should load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should access queue manager tab in dashboard', async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    
    await page.goto('/dashboard');
    await TestHelper.waitForPageLoad(page);
    
    // Take a screenshot to debug
    await page.screenshot({ path: 'debug-dashboard.png' });
    
    // Look for any button or clickable element that contains queue-related text
    const queueButton = page.locator('button').filter({ hasText: /queue/i }).first();
    await expect(queueButton).toBeVisible({ timeout: 10000 });
    await queueButton.click();
    
    await page.waitForTimeout(1000);
    
    // Should see queue manager content or tab change
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should access playlist library tab in dashboard', async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    
    await page.goto('/dashboard');
    await TestHelper.waitForPageLoad(page);
    
    // Look for any button or clickable element that contains playlist-related text
    const playlistButton = page.locator('button').filter({ hasText: /playlist/i }).first();
    await expect(playlistButton).toBeVisible({ timeout: 10000 });
    await playlistButton.click();
    
    await page.waitForTimeout(1000);
    
    // Should see playlist library content or tab change
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should access admin console tab in dashboard', async ({ page }) => {
    await TestHelper.setupAppwriteSession(page);
    
    await page.goto('/dashboard');
    await TestHelper.waitForPageLoad(page);
    
    // Look for any button or clickable element that contains admin-related text
    const adminButton = page.locator('button').filter({ hasText: /admin|console/i }).first();
    await expect(adminButton).toBeVisible({ timeout: 10000 });
    await adminButton.click();
    
    await page.waitForTimeout(1000);
    
    // Should see admin console content or tab change
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});