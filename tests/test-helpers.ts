import { type Page, type BrowserContext, expect } from '@playwright/test';
import { Client, Account, Databases, Functions } from 'appwrite';

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

  // Database verification utilities
  static async getAppwriteClient(): Promise<{ client: Client; databases: Databases; functions: Functions }> {
    const client = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '68cc86c3002b27e13947');

    // For server-side operations, we need to authenticate with API key
    // This would require setting up a server session or using a service account
    // For now, we'll use the client without authentication for read operations
    
    const databases = new Databases(client);
    const functions = new Functions(client);

    return { client, databases, functions };
  }

  static async checkUserExists(email: string): Promise<any | null> {
    try {
      const { databases } = await this.getAppwriteClient();
      const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';
      
      // Query users collection for the email
      const response = await databases.listDocuments(databaseId, 'users', [
        `email=${email}`
      ]);
      
      return response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return null;
    }
  }

  static async checkVenueExists(venueId: string): Promise<any | null> {
    try {
      const { databases } = await this.getAppwriteClient();
      const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';
      
      // Query venues collection for the venue_id
      const response = await databases.listDocuments(databaseId, 'venues', [
        `$id=${venueId}`
      ]);
      
      return response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
      console.error('Error checking venue existence:', error);
      return null;
    }
  }

  static async updateUserVenueId(userId: string, venueId: string): Promise<void> {
    try {
      const { databases } = await this.getAppwriteClient();
      const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';
      
      await databases.updateDocument(databaseId, 'users', userId, {
        venue_id: venueId
      });
      
      console.log(`✅ Updated user ${userId} with venue_id: ${venueId}`);
    } catch (error) {
      console.error('Error updating user venue_id:', error);
      throw error;
    }
  }

  static async getFunctionExecutions(functionId: string, limit: number = 10): Promise<any[]> {
    try {
      const { functions } = await this.getAppwriteClient();
      
      // listExecutions expects queries array, not limit
      const response = await functions.listExecutions(functionId, []);
      return response.executions.slice(0, limit);
    } catch (error) {
      console.error('Error getting function executions:', error);
      return [];
    }
  }

  static async waitForFunctionExecution(functionId: string, timeoutMs: number = 30000): Promise<any | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const executions = await this.getFunctionExecutions(functionId, 1);
      
      if (executions.length > 0) {
        const latestExecution = executions[0];
        if (latestExecution.status === 'completed') {
          return latestExecution;
        }
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return null;
  }

  static async loginWithCredentials(page: Page, email: string, password: string): Promise<void> {
    // Navigate to homepage
    await page.goto('/');
    await this.waitForPageLoad(page);
    
    // Wait for and click sign in button
    const signInButton = page.locator('button').filter({
      hasText: /sign in with google|google|login/i
    }).first();
    
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();
    
    // Handle Google OAuth - this would need to be mocked or use test credentials
    // For now, we'll assume the OAuth flow completes
    await page.waitForURL(/\/djamms-dashboard/, { timeout: 30000 });
  }

  static async logout(page: Page): Promise<void> {
    // Look for logout button
    const logoutButton = page.locator('button').filter({
      hasText: /logout|sign out/i
    }).first();
    
    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click();
      await page.waitForURL('/', { timeout: 10000 });
    } else {
      // Fallback: clear session and reload
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();
      await page.waitForURL('/', { timeout: 10000 });
    }
  }

  static async callAuthSetupHandler(userId: string): Promise<void> {
    try {
      const { functions } = await this.getAppwriteClient();
      
      const execution = await functions.createExecution('auth-setup-handler', JSON.stringify({ userId }));
      console.log('✅ Auth setup handler called successfully:', execution.$id);
      
      // Wait for execution to complete
      let attempts = 0;
      while (attempts < 10) {
        const status = await functions.getExecution('auth-setup-handler', execution.$id);
        if (status.status === 'completed') {
          console.log('✅ Auth setup handler execution completed');
          return;
        } else if (status.status === 'failed') {
          throw new Error('Auth setup handler failed');
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      throw new Error('Auth setup handler execution timed out');
    } catch (error) {
      console.error('Error calling auth setup handler:', error);
      throw error;
    }
  }
}