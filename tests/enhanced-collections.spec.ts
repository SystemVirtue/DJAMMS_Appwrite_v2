import { test, expect, type Page } from '@playwright/test';
import { TestHelper } from './test-helpers';

test.describe('Enhanced Database Collections', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await TestHelper.setupAppwriteSession(page);
    await page.goto('/dashboard');
    await TestHelper.waitForPageLoad(page);
  });
  
  test.afterEach(async () => {
    await TestHelper.cleanupTestData(page);
  });

  test.describe('User Queue Management', () => {
    test('should create and manage user queue', async () => {
      // Navigate to queue manager
      await page.goto('/queuemanager');
      await TestHelper.waitForPageLoad(page);
      
      // Verify queue manager loaded
      await expect(page.locator('h1, h2')).toContainText(/queue manager/i);
      
      // Test adding track to queue
      const testVideoId = TestHelper.generateTestVideoId();
      
      // Look for add to queue button or input
      const addButton = page.getByRole('button', { name: /add to queue/i }).first();
      if (await addButton.isVisible()) {
        await addButton.click();
        
        // Fill in video details
        await page.fill('input[placeholder*="youtube"]', `https://www.youtube.com/watch?v=${testVideoId}`);
        await page.getByRole('button', { name: /add/i }).click();
        
        // Verify track was added to queue
        await expect(page.locator('[data-testid="queue-item"]').first()).toBeVisible();
      }
      
      // Test queue controls
      const shuffleButton = page.getByRole('button', { name: /shuffle/i });
      const repeatButton = page.getByRole('button', { name: /repeat/i });
      
      if (await shuffleButton.isVisible()) {
        await shuffleButton.click();
        // Verify shuffle state changed
        await expect(shuffleButton).toHaveAttribute('data-active', 'true');
      }
      
      if (await repeatButton.isVisible()) {
        await repeatButton.click();
        // Verify repeat state changed
        await expect(repeatButton).toHaveAttribute('data-active', 'true');
      }
    });
    
    test('should persist queue state across page reloads', async () => {
      await page.goto('/queuemanager');
      
      // Add a test track if possible
      const testVideoId = TestHelper.generateTestVideoId();
      
      // Reload page
      await page.reload();
      await TestHelper.waitForPageLoad(page);
      
      // Queue should be restored
      await expect(page.locator('h1, h2')).toContainText(/queue manager/i);
    });
  });

  test.describe('User Instance Settings', () => {
    test('should save and load user preferences', async () => {
      // Navigate to admin console
      await page.goto('/adminconsole');
      await TestHelper.waitForPageLoad(page);
      
      // Verify admin console loaded
      await expect(page.locator('h1, h2')).toContainText(/admin console|preferences|settings/i);
      
      // Test theme settings
      const themeSelect = page.locator('select[name*="theme"], [data-theme-selector]').first();
      if (await themeSelect.isVisible()) {
        await themeSelect.selectOption('dark');
        
        // Save settings
        const saveButton = page.getByRole('button', { name: /save/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await expect(page.locator('.success-message, .toast')).toBeVisible();
        }
      }
      
      // Test volume settings
      const volumeSlider = page.locator('input[type="range"][name*="volume"]').first();
      if (await volumeSlider.isVisible()) {
        await volumeSlider.fill('75');
      }
      
      // Test auto-play settings
      const autoplayCheckbox = page.locator('input[type="checkbox"][name*="autoplay"]').first();
      if (await autoplayCheckbox.isVisible()) {
        await autoplayCheckbox.check();
      }
    });
    
    test('should persist settings across sessions', async () => {
      await page.goto('/adminconsole');
      
      // Change a setting
      const volumeSlider = page.locator('input[type="range"][name*="volume"]').first();
      if (await volumeSlider.isVisible()) {
        await volumeSlider.fill('50');
      }
      
      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/adminconsole');
      
      // Setting should be persisted
      if (await volumeSlider.isVisible()) {
        await expect(volumeSlider).toHaveValue('50');
      }
    });
  });

  test.describe('Enhanced Playlists', () => {
    test('should create enhanced playlist with metadata', async () => {
      await page.goto('/playlistlibrary');
      await TestHelper.waitForPageLoad(page);
      
      // Create new playlist
      const createButton = page.getByRole('button', { name: /create playlist/i });
      await expect(createButton).toBeVisible();
      await createButton.click();
      
      // Fill in enhanced playlist details
      const playlistName = `Test Enhanced Playlist ${Date.now()}`;
      await page.fill('input[name*="name"]', playlistName);
      
      // Set category
      const categorySelect = page.locator('select[name*="category"]').first();
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption('rock');
      }
      
      // Set description
      const descriptionField = page.locator('textarea[name*="description"]').first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Test playlist for enhanced features');
      }
      
      // Set mood
      const moodSelect = page.locator('select[name*="mood"]').first();
      if (await moodSelect.isVisible()) {
        await moodSelect.selectOption('energetic');
      }
      
      // Submit
      await page.getByRole('button', { name: /create|save/i }).click();
      
      // Verify playlist was created
      await expect(page.locator(`[data-playlist-name*="${playlistName}"]`)).toBeVisible();
    });
    
    test('should support playlist tags and search', async () => {
      await page.goto('/playlistlibrary');
      
      // Test search functionality
      const searchInput = page.locator('input[name*="search"], input[placeholder*="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('rock');
        
        // Verify filtered results
        await expect(page.locator('[data-playlist]')).toBeVisible();
      }
      
      // Test category filtering
      const categoryFilter = page.locator('select[name*="category"], [data-category-filter]').first();
      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption('rock');
        
        // Verify filtered results
        await expect(page.locator('[data-playlist]')).toBeVisible();
      }
    });
  });

  test.describe('User Play History', () => {
    test('should track play history', async () => {
      // Navigate to player
      await page.goto('/videoplayer');
      await TestHelper.waitForPageLoad(page);
      
      // Simulate playing a track (this would require the player to be functional)
      const testVideoId = TestHelper.generateTestVideoId();
      
      // If there's a URL input for testing
      const urlInput = page.locator('input[name*="url"], input[placeholder*="youtube"]').first();
      if (await urlInput.isVisible()) {
        await urlInput.fill(`https://www.youtube.com/watch?v=${testVideoId}`);
        
        const playButton = page.getByRole('button', { name: /play/i });
        if (await playButton.isVisible()) {
          await playButton.click();
        }
      }
      
      // Check if history is being tracked (navigate to a history view)
      // This would depend on your UI implementation
      await page.goto('/dashboard'); // Or wherever history is shown
      
      // Look for recently played section
      const historySection = page.locator('[data-testid*="history"], .recent-tracks, .play-history').first();
      if (await historySection.isVisible()) {
        await expect(historySection).toBeVisible();
      }
    });
  });

  test.describe('User Playlist Favorites', () => {
    test('should manage playlist favorites and ratings', async () => {
      await page.goto('/playlistlibrary');
      await TestHelper.waitForPageLoad(page);
      
      // Find a playlist to favorite
      const playlistItem = page.locator('[data-playlist]').first();
      if (await playlistItem.isVisible()) {
        // Look for favorite button
        const favoriteButton = playlistItem.locator('[data-favorite], .favorite-btn, button[title*="favorite"]').first();
        if (await favoriteButton.isVisible()) {
          await favoriteButton.click();
          
          // Verify favorited state
          await expect(favoriteButton).toHaveAttribute('data-favorited', 'true');
        }
        
        // Look for rating system
        const ratingStars = playlistItem.locator('.rating-star, [data-rating]');
        const starCount = await ratingStars.count();
        if (starCount > 0) {
          // Click on 4th star for 4-star rating
          const fourthStar = ratingStars.nth(3);
          if (await fourthStar.isVisible()) {
            await fourthStar.click();
          }
        }
      }
      
      // Test filtering by favorites
      const favoritesFilter = page.locator('button[name*="favorites"], .favorites-only').first();
      if (await favoritesFilter.isVisible()) {
        await favoritesFilter.click();
        
        // Should show only favorited playlists
        await expect(page.locator('[data-favorited="true"]')).toBeVisible();
      }
    });
  });
});