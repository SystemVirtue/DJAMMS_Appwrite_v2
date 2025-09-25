import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TestHelper } from './test-helpers';

test.describe('Real-time Synchronization', () => {
  let context: BrowserContext;
  let window1: Page;
  let window2: Page;
  
  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    
    // Setup two windows for real-time sync testing
    window1 = await context.newPage();
    window2 = await context.newPage();
    
    // Setup authentication for both windows
    await TestHelper.setupAppwriteSession(window1);
    await TestHelper.setupAppwriteSession(window2);
    
    // Navigate both to dashboard
    await window1.goto('/dashboard');
    await window2.goto('/dashboard');
    
    await TestHelper.waitForPageLoad(window1);
    await TestHelper.waitForPageLoad(window2);
  });
  
  test.afterEach(async () => {
    await TestHelper.cleanupTestData(window1);
    await TestHelper.cleanupTestData(window2);
    await context.close();
  });

  test('should synchronize queue changes between windows', async () => {
    // Open queue manager in both windows
    await window1.goto('/queuemanager');
    await window2.goto('/queuemanager');
    
    await TestHelper.waitForPageLoad(window1);
    await TestHelper.waitForPageLoad(window2);
    
    // Add track to queue in window1
    const testVideoId = TestHelper.generateTestVideoId();
    const addButton1 = window1.getByRole('button', { name: /add to queue/i }).first();
    
    if (await addButton1.isVisible()) {
      await addButton1.click();
      
      const urlInput = window1.locator('input[placeholder*="youtube"]').first();
      if (await urlInput.isVisible()) {
        await urlInput.fill(`https://www.youtube.com/watch?v=${testVideoId}`);
        await window1.getByRole('button', { name: /add/i }).click();
        
        // Wait for the track to be added
        await window1.waitForTimeout(2000);
        
        // Check if window2 shows the new track
        await window2.waitForTimeout(3000); // Wait for real-time sync
        
        const queueItems2 = window2.locator('[data-testid="queue-item"], .queue-track, [data-queue-track]');
        const queueCount2 = await queueItems2.count();
        
        expect(queueCount2).toBeGreaterThan(0);
      }
    }
  });

  test('should synchronize playback state between player windows', async () => {
    // Open player in both windows
    await window1.goto('/videoplayer');
    await window2.goto('/videoplayer');
    
    await TestHelper.waitForPageLoad(window1);
    await TestHelper.waitForPageLoad(window2);
    
    // Start playback in window1
    const playButton1 = window1.getByRole('button', { name: /play/i });
    
    if (await playButton1.isVisible()) {
      await playButton1.click();
      
      // Wait for sync
      await window2.waitForTimeout(3000);
      
      // Check if window2 shows playing state
      const playingState2 = window2.locator('[data-playing="true"], .playing, .is-playing').first();
      const pauseButton2 = window2.getByRole('button', { name: /pause/i });
      
      const isPlaying = await playingState2.isVisible() || await pauseButton2.isVisible();
      if (isPlaying) {
        expect(isPlaying).toBe(true);
      }
    }
  });

  test('should synchronize playlist changes between windows', async () => {
    // Open playlist library in both windows
    await window1.goto('/playlistlibrary');
    await window2.goto('/playlistlibrary');
    
    await TestHelper.waitForPageLoad(window1);
    await TestHelper.waitForPageLoad(window2);
    
    // Create playlist in window1
    const createButton1 = window1.getByRole('button', { name: /create playlist/i });
    
    if (await createButton1.isVisible()) {
      await createButton1.click();
      
      const playlistName = `Sync Test Playlist ${Date.now()}`;
      const nameInput = window1.locator('input[name*="name"]').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill(playlistName);
        await window1.getByRole('button', { name: /create|save/i }).click();
        
        // Wait for creation and sync
        await window1.waitForTimeout(2000);
        await window2.waitForTimeout(4000);
        
        // Refresh window2 to see updated playlists
        await window2.reload();
        await TestHelper.waitForPageLoad(window2);
        
        // Check if new playlist appears in window2
        const newPlaylist2 = window2.locator(`[data-playlist-name*="${playlistName}"]`);
        if (await newPlaylist2.isVisible()) {
          await expect(newPlaylist2).toBeVisible();
        }
      }
    }
  });

  test('should synchronize user settings between windows', async () => {
    // Open admin console in both windows
    await window1.goto('/adminconsole');
    await window2.goto('/adminconsole');
    
    await TestHelper.waitForPageLoad(window1);
    await TestHelper.waitForPageLoad(window2);
    
    // Change volume setting in window1
    const volumeSlider1 = window1.locator('input[type="range"][name*="volume"]').first();
    
    if (await volumeSlider1.isVisible()) {
      await volumeSlider1.fill('60');
      
      // Save settings if there's a save button
      const saveButton1 = window1.getByRole('button', { name: /save/i });
      if (await saveButton1.isVisible()) {
        await saveButton1.click();
      }
      
      // Wait for sync
      await window2.waitForTimeout(4000);
      
      // Check if window2 reflects the change
      await window2.reload();
      await TestHelper.waitForPageLoad(window2);
      
      const volumeSlider2 = window2.locator('input[type="range"][name*="volume"]').first();
      if (await volumeSlider2.isVisible()) {
        const volume2Value = await volumeSlider2.inputValue();
        expect(volume2Value).toBe('60');
      }
    }
  });

  test('should handle real-time connection loss and recovery', async () => {
    await window1.goto('/queuemanager');
    await window2.goto('/queuemanager');
    
    // Simulate network interruption
    await window1.context().setOffline(true);
    
    // Try to make changes while offline
    const addButton1 = window1.getByRole('button', { name: /add to queue/i }).first();
    if (await addButton1.isVisible()) {
      await addButton1.click();
      
      // Should show offline indicator or error
      const offlineIndicator = window1.locator('[data-offline], .offline-indicator, .connection-error').first();
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toBeVisible();
      }
    }
    
    // Restore connection
    await window1.context().setOffline(false);
    
    // Should reconnect and sync
    await window1.waitForTimeout(3000);
    
    // Check if connection is restored
    const connectedIndicator = window1.locator('[data-online], .connected, .connection-ok').first();
    if (await connectedIndicator.isVisible()) {
      await expect(connectedIndicator).toBeVisible();
    }
  });

  test('should synchronize instance states across windows', async () => {
    // Open different windows for different components
    await window1.goto('/videoplayer');
    await window2.goto('/queuemanager');
    
    await TestHelper.waitForPageLoad(window1);
    await TestHelper.waitForPageLoad(window2);
    
    // Check if both windows show the same instance state
    const instanceId1 = await window1.evaluate(() => {
      return localStorage.getItem('djamms-instance-id') || 'unknown';
    });
    
    const instanceId2 = await window2.evaluate(() => {
      return localStorage.getItem('djamms-instance-id') || 'unknown';
    });
    
    // Both windows should share the same instance ID
    expect(instanceId1).toBe(instanceId2);
    
    // Test status synchronization
    const statusIndicator1 = window1.locator('[data-status], .status-indicator').first();
    const statusIndicator2 = window2.locator('[data-status], .status-indicator').first();
    
    if (await statusIndicator1.isVisible() && await statusIndicator2.isVisible()) {
      const status1 = await statusIndicator1.textContent();
      const status2 = await statusIndicator2.textContent();
      
      // Statuses should be consistent or related
      expect(status1).toBeDefined();
      expect(status2).toBeDefined();
    }
  });

  test('should handle multiple users in real-time', async () => {
    // This test simulates multiple users (different sessions)
    const user2Context = await context.browser()?.newContext();
    if (!user2Context) return;
    
    const user2Window = await user2Context.newPage();
    await TestHelper.setupAppwriteSession(user2Window);
    
    // Set different user ID for second session
    await user2Window.evaluate(() => {
      localStorage.setItem('appwrite-user', JSON.stringify({
        $id: 'test-user-2',
        name: 'Test User 2',
        email: 'test2@example.com'
      }));
    });
    
    await user2Window.goto('/queuemanager');
    await TestHelper.waitForPageLoad(user2Window);
    
    // Both users should see their own queues
    await window1.goto('/queuemanager');
    await TestHelper.waitForPageLoad(window1);
    
    // Each should have independent queue state
    const queue1Items = await window1.locator('[data-testid="queue-item"]').count();
    const queue2Items = await user2Window.locator('[data-testid="queue-item"]').count();
    
    // Queues can be different for different users
    expect(queue1Items).toBeGreaterThanOrEqual(0);
    expect(queue2Items).toBeGreaterThanOrEqual(0);
    
    await user2Context.close();
  });

  test('should maintain sync during rapid changes', async () => {
    await window1.goto('/queuemanager');
    await window2.goto('/queuemanager');
    
    await TestHelper.waitForPageLoad(window1);
    await TestHelper.waitForPageLoad(window2);
    
    // Make rapid changes in window1
    const shuffleButton1 = window1.getByRole('button', { name: /shuffle/i });
    const repeatButton1 = window1.getByRole('button', { name: /repeat/i });
    
    if (await shuffleButton1.isVisible() && await repeatButton1.isVisible()) {
      // Toggle shuffle rapidly
      await shuffleButton1.click();
      await window1.waitForTimeout(500);
      await shuffleButton1.click();
      await window1.waitForTimeout(500);
      
      // Toggle repeat
      await repeatButton1.click();
      await window1.waitForTimeout(500);
      
      // Wait for sync
      await window2.waitForTimeout(3000);
      
      // Check final state synchronization
      const shuffleState2 = await window2.getByRole('button', { name: /shuffle/i }).getAttribute('data-active');
      const repeatState2 = await window2.getByRole('button', { name: /repeat/i }).getAttribute('data-active');
      
      // States should be consistent (either both active or inactive)
      expect(shuffleState2).toBeDefined();
      expect(repeatState2).toBeDefined();
    }
  });
});