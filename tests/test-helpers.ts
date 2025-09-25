import { type Page, type BrowserContext, expect } from '@playwright/test';
import { Client, Account } from 'appwrite';

export class TestHelper {
  static async authenticateWithGoogle(page: Page): Promise<void> {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for the Google Sign-In button
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
    
    // Click the Google Sign-In button
    await page.getByRole('button', { name: /sign in with google/i }).click();
    
    // Handle Google OAuth flow
    // Note: In real tests, you'd need to set up test credentials or mock the OAuth flow
    // For now, we'll assume the flow completes successfully
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  }
  
  static async setupAppwriteSession(page: Page): Promise<void> {
    // Inject Appwrite session for testing
    await page.addInitScript(() => {
      // Mock successful authentication state
      localStorage.setItem('appwrite-session', 'test-session-token');
      localStorage.setItem('appwrite-user', JSON.stringify({
        $id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        prefs: {
          venue_id: 'test-venue-id'
        }
      }));
      
      // Set global venue_id
      (window as any).DJAMMS_VENUE_ID = 'test-venue-id';
    });
  }
  
  static async openNewWindow(context: BrowserContext, path: string): Promise<Page> {
    const newPage = await context.newPage();
    await newPage.goto(path);
    return newPage;
  }
  
  static async waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');
  }
  
  static async createTestPlaylist(page: Page, name: string): Promise<string> {
    // Navigate to dashboard and open playlist library tab
    await page.goto('/dashboard');
    await this.waitForPageLoad(page);
    
    // Click on playlist library tab
    await page.click('button:has-text("Playlist Library")');
    await page.waitForTimeout(500);
    
    // Click create new playlist button
    await page.click('button:has-text("Create New Playlist"), button:has-text("New Playlist")');
    
    // Fill in playlist name
    await page.fill('input[placeholder*="playlist"], input[name*="name"]', name);
    
    // Click save/create button
    await page.click('button:has-text("Create"), button:has-text("Save")');
    
    // Wait for playlist to be created
    await page.waitForTimeout(1000);
    
    return 'test-playlist-id';
  }

  static async navigateToTab(page: Page, tabName: 'Queue Manager' | 'Playlist Library' | 'Admin Console'): Promise<void> {
    await page.goto('/dashboard');
    await this.waitForPageLoad(page);
    
    // Click on the specified tab
    await page.click(`button:has-text("${tabName}")`);
    await page.waitForTimeout(500); // Wait for tab content to load
  }

  static async waitForTabContent(page: Page, tabType: 'queue' | 'playlist' | 'admin'): Promise<void> {
    const selectors = {
      queue: '[data-testid="queue-manager-tab"], .queue-manager, h2:has-text("Queue Manager")',
      playlist: '[data-testid="playlist-library-tab"], .playlist-library, h2:has-text("Playlist Library")',
      admin: '[data-testid="admin-console-tab"], .admin-console, h2:has-text("Admin Console")'
    };
    
    await expect(page.locator(selectors[tabType]).first()).toBeVisible();
  }
  
  static async addTrackToPlaylist(page: Page, playlistId: string, videoId: string): Promise<void> {
    // This would simulate adding a track to a playlist
    // Implementation depends on your UI
    await page.locator(`[data-playlist-id="${playlistId}"]`).click();
    
    // Click add track button
    await page.getByRole('button', { name: /add track/i }).click();
    
    // Enter video URL or ID
    await page.fill('input[name="videoUrl"]', `https://www.youtube.com/watch?v=${videoId}`);
    
    // Submit
    await page.getByRole('button', { name: /add/i }).click();
  }
  
  static generateTestVideoId(): string {
    // Generate a valid-looking YouTube video ID for testing
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  static async cleanupTestData(page: Page): Promise<void> {
    // Clean up any test data created during the test
    await page.evaluate(() => {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
    });
  }
}