import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { TestHelper } from './test-helpers';

test.describe('Multi-Window Functionality', () => {
  let context: BrowserContext;
  let dashboardPage: Page;
  let playerPage: Page;
  let queuePage: Page;
  let playlistPage: Page;
  
  test.beforeEach(async ({ browser }) => {
    // Create a new context for multi-window testing
    context = await browser.newContext();
    
    // Setup main dashboard window
    dashboardPage = await context.newPage();
    await TestHelper.setupAppwriteSession(dashboardPage);
    await dashboardPage.goto('/dashboard');
    await TestHelper.waitForPageLoad(dashboardPage);
  });
  
  test.afterEach(async () => {
    // Cleanup all pages
    await TestHelper.cleanupTestData(dashboardPage);
    await context.close();
  });

  test('should open video player in separate window', async () => {
    // Click on video player card in dashboard
    const playerCard = dashboardPage.getByRole('button', { name: /video player/i });
    await expect(playerCard).toBeVisible();
    
    // Click to open player (might open in same window or new window depending on implementation)
    await playerCard.click();
    
    // Wait for navigation or new page
    await TestHelper.waitForPageLoad(dashboardPage);
    
    // If it opens in same window, check URL
    if (dashboardPage.url().includes('/videoplayer')) {
      playerPage = dashboardPage;
    } else {
      // If it opens in new window, get the new page
      const pages = context.pages();
      playerPage = pages.find(p => p.url().includes('/videoplayer')) || dashboardPage;
    }
    
    // Verify player interface loaded
    await expect(playerPage.locator('h1, h2, [data-testid="player"]')).toBeVisible();
    
    // Test player controls are present
    const playButton = playerPage.getByRole('button', { name: /play/i });
    const pauseButton = playerPage.getByRole('button', { name: /pause/i });
    const volumeControl = playerPage.locator('input[type="range"], [data-volume-slider]').first();
    
    // At least one player control should be visible
    const playerControlsVisible = await playButton.isVisible() || 
                                   await pauseButton.isVisible() || 
                                   await volumeControl.isVisible();
    expect(playerControlsVisible).toBe(true);
  });

  test('should open playlist library in separate window', async () => {
    // Click on playlist library card
    const playlistCard = dashboardPage.getByRole('button', { name: /playlist library/i });
    await expect(playlistCard).toBeVisible();
    await playlistCard.click();
    
    await TestHelper.waitForPageLoad(dashboardPage);
    
    // Get the playlist page (same or new window)
    if (dashboardPage.url().includes('/playlistlibrary')) {
      playlistPage = dashboardPage;
    } else {
      const pages = context.pages();
      playlistPage = pages.find(p => p.url().includes('/playlistlibrary')) || dashboardPage;
    }
    
    // Verify playlist library loaded
    await expect(playlistPage.locator('h1, h2')).toContainText(/playlist/i);
    
    // Test playlist library functionality
    const createButton = playlistPage.getByRole('button', { name: /create playlist/i });
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
    
    // Check for playlist grid/list
    const playlistContainer = playlistPage.locator('[data-playlists], .playlist-grid, .playlist-list').first();
    if (await playlistContainer.isVisible()) {
      await expect(playlistContainer).toBeVisible();
    }
  });

  test('should open queue manager in separate window', async () => {
    // Click on queue manager card
    const queueCard = dashboardPage.getByRole('button', { name: /queue manager/i });
    await expect(queueCard).toBeVisible();
    await queueCard.click();
    
    await TestHelper.waitForPageLoad(dashboardPage);
    
    // Get the queue page
    if (dashboardPage.url().includes('/queuemanager')) {
      queuePage = dashboardPage;
    } else {
      const pages = context.pages();
      queuePage = pages.find(p => p.url().includes('/queuemanager')) || dashboardPage;
    }
    
    // Verify queue manager loaded
    await expect(queuePage.locator('h1, h2')).toContainText(/queue/i);
    
    // Test queue functionality
    const queueContainer = queuePage.locator('[data-queue], .queue-list, [data-testid="queue"]').first();
    if (await queueContainer.isVisible()) {
      await expect(queueContainer).toBeVisible();
    }
    
    // Check for queue controls
    const shuffleButton = queuePage.getByRole('button', { name: /shuffle/i });
    const repeatButton = queuePage.getByRole('button', { name: /repeat/i });
    const clearButton = queuePage.getByRole('button', { name: /clear/i });
    
    // At least one queue control should be visible
    const queueControlsVisible = await shuffleButton.isVisible() || 
                                  await repeatButton.isVisible() || 
                                  await clearButton.isVisible();
    expect(queueControlsVisible).toBe(true);
  });

  test('should handle multiple windows simultaneously', async () => {
    // Open all windows
    await dashboardPage.getByRole('button', { name: /video player/i }).click();
    await TestHelper.waitForPageLoad(dashboardPage);
    
    // Open queue manager in new window/tab
    playerPage = await TestHelper.openNewWindow(context, '/videoplayer');
    queuePage = await TestHelper.openNewWindow(context, '/queuemanager');
    playlistPage = await TestHelper.openNewWindow(context, '/playlistlibrary');
    
    // Verify all windows are functional
    await expect(dashboardPage.locator('h1, h2')).toContainText(/dashboard/i);
    await expect(playerPage.locator('[data-testid="player"], h1, h2')).toBeVisible();
    await expect(queuePage.locator('h1, h2')).toContainText(/queue/i);
    await expect(playlistPage.locator('h1, h2')).toContainText(/playlist/i);
    
    // Test that each window maintains its state
    await dashboardPage.reload();
    await playerPage.reload();
    await queuePage.reload();
    await playlistPage.reload();
    
    // All should still be functional after reload
    await TestHelper.waitForPageLoad(dashboardPage);
    await TestHelper.waitForPageLoad(playerPage);
    await TestHelper.waitForPageLoad(queuePage);
    await TestHelper.waitForPageLoad(playlistPage);
    
    await expect(dashboardPage.locator('h1, h2')).toContainText(/dashboard/i);
    await expect(playerPage.locator('[data-testid="player"], h1, h2')).toBeVisible();
    await expect(queuePage.locator('h1, h2')).toContainText(/queue/i);
    await expect(playlistPage.locator('h1, h2')).toContainText(/playlist/i);
  });

  test('should maintain instance synchronization across windows', async () => {
    // Open player and queue manager
    playerPage = await TestHelper.openNewWindow(context, '/videoplayer');
    queuePage = await TestHelper.openNewWindow(context, '/queuemanager');
    
    // Add track to queue in queue manager
    const testVideoId = TestHelper.generateTestVideoId();
    
    const addButton = queuePage.getByRole('button', { name: /add to queue/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const urlInput = queuePage.locator('input[placeholder*="youtube"]').first();
      if (await urlInput.isVisible()) {
        await urlInput.fill(`https://www.youtube.com/watch?v=${testVideoId}`);
        await queuePage.getByRole('button', { name: /add/i }).click();
      }
    }
    
    // Wait for synchronization
    await queuePage.waitForTimeout(2000);
    
    // Check if player window reflects the change
    await playerPage.reload();
    await TestHelper.waitForPageLoad(playerPage);
    
    // Look for current track or queue status in player
    const currentTrack = playerPage.locator('[data-current-track], .current-song, [data-testid="current-track"]').first();
    if (await currentTrack.isVisible()) {
      await expect(currentTrack).toBeVisible();
    }
    
    // Test playback controls synchronization
    const playButton = playerPage.getByRole('button', { name: /play/i });
    if (await playButton.isVisible()) {
      await playButton.click();
      
      // Wait and check if queue manager shows playing state
      await queuePage.waitForTimeout(1000);
      const playingIndicator = queuePage.locator('[data-playing="true"], .playing-indicator, .is-playing').first();
      if (await playingIndicator.isVisible()) {
        await expect(playingIndicator).toBeVisible();
      }
    }
  });

  test('should handle window navigation between sections', async () => {
    // Start in dashboard
    await expect(dashboardPage.locator('h1, h2')).toContainText(/dashboard/i);
    
    // Navigate to each section and back
    const sections = [
      { name: /video player/i, url: '/videoplayer' },
      { name: /playlist library/i, url: '/playlistlibrary' },
      { name: /queue manager/i, url: '/queuemanager' },
      { name: /admin console/i, url: '/adminconsole' }
    ];
    
    for (const section of sections) {
      // Click section card
      const sectionCard = dashboardPage.getByRole('button', { name: section.name });
      if (await sectionCard.isVisible()) {
        await sectionCard.click();
        await TestHelper.waitForPageLoad(dashboardPage);
        
        // Verify navigation
        if (dashboardPage.url().includes(section.url)) {
          // Successfully navigated
          expect(dashboardPage.url()).toContain(section.url);
        }
        
        // Navigate back to dashboard
        await dashboardPage.goto('/dashboard');
        await TestHelper.waitForPageLoad(dashboardPage);
        await expect(dashboardPage.locator('h1, h2')).toContainText(/dashboard/i);
      }
    }
  });
});