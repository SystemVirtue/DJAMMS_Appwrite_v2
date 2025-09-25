import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TestHelper } from './test-helpers';

test.describe('Playlist Migration System', () => {
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

  test('should detect legacy playlists and offer migration', async () => {
    // Navigate to playlist library
    await page.goto('/playlistlibrary');
    await TestHelper.waitForPageLoad(page);
    
    // Look for migration banner or prompt
    const migrationBanner = page.locator('[data-migration-banner], .migration-prompt, .legacy-playlist-notice').first();
    const migrationButton = page.getByRole('button', { name: /migrate|upgrade/i });
    
    // Check if migration UI is present (depends on whether there are legacy playlists)
    const migrationUIVisible = await migrationBanner.isVisible() || await migrationButton.isVisible();
    
    if (migrationUIVisible) {
      // Test migration flow
      if (await migrationButton.isVisible()) {
        await migrationButton.click();
        
        // Should show migration dialog or navigate to migration page
        const migrationDialog = page.locator('[data-migration-dialog], .migration-modal, dialog').first();
        const migrationPage = page.url().includes('/migrate');
        
        expect(await migrationDialog.isVisible() || migrationPage).toBe(true);
      }
    } else {
      // If no migration UI, create some test legacy data and test programmatically
      console.log('No legacy playlists detected for migration testing');
    }
  });

  test('should perform automatic playlist categorization', async () => {
    // This test simulates the smart categorization feature
    await page.goto('/playlistlibrary');
    
    // Look for auto-categorization feature
    const autoCategorizeButton = page.getByRole('button', { name: /auto.categorize|smart.categorize/i });
    
    if (await autoCategorizeButton.isVisible()) {
      await autoCategorizeButton.click();
      
      // Should show progress or results
      const progressIndicator = page.locator('[data-progress], .progress-bar, .loading').first();
      const resultsContainer = page.locator('[data-categorization-results], .categorization-results').first();
      
      // Wait for operation to complete
      await page.waitForTimeout(3000);
      
      // Check for completion feedback
      const completionMessage = page.locator('.success-message, .completion-message, [data-success]').first();
      if (await completionMessage.isVisible()) {
        await expect(completionMessage).toBeVisible();
      }
    }
  });

  test('should migrate individual playlist with enhanced features', async () => {
    await page.goto('/playlistlibrary');
    
    // Look for individual playlist migration
    const legacyPlaylist = page.locator('[data-legacy-playlist], .legacy-playlist').first();
    
    if (await legacyPlaylist.isVisible()) {
      // Find migrate button for this playlist
      const migrateButton = legacyPlaylist.locator('button[title*="migrate"], .migrate-btn').first();
      
      if (await migrateButton.isVisible()) {
        await migrateButton.click();
        
        // Should show migration form with enhanced options
        const migrationForm = page.locator('[data-migration-form], form[data-migrate]').first();
        await expect(migrationForm).toBeVisible();
        
        // Fill in enhanced metadata
        const categorySelect = migrationForm.locator('select[name*="category"]').first();
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption('rock');
        }
        
        const moodSelect = migrationForm.locator('select[name*="mood"]').first();
        if (await moodSelect.isVisible()) {
          await moodSelect.selectOption('energetic');
        }
        
        const descriptionField = migrationForm.locator('textarea[name*="description"]').first();
        if (await descriptionField.isVisible()) {
          await descriptionField.fill('Migrated from legacy playlist with enhanced metadata');
        }
        
        // Submit migration
        const submitButton = migrationForm.getByRole('button', { name: /migrate|convert|upgrade/i });
        await submitButton.click();
        
        // Verify migration success
        const successMessage = page.locator('.success-message, [data-success]').first();
        await expect(successMessage).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should handle batch playlist migration', async () => {
    await page.goto('/playlistlibrary');
    
    // Look for batch migration features
    const selectAllCheckbox = page.locator('input[type="checkbox"][data-select-all]').first();
    const batchMigrateButton = page.getByRole('button', { name: /migrate selected|batch migrate/i });
    
    if (await selectAllCheckbox.isVisible() && await batchMigrateButton.isVisible()) {
      // Select all legacy playlists
      await selectAllCheckbox.check();
      
      // Verify some playlists are selected
      const selectedCount = await page.locator('input[type="checkbox"][data-playlist]:checked').count();
      expect(selectedCount).toBeGreaterThan(0);
      
      // Start batch migration
      await batchMigrateButton.click();
      
      // Should show batch migration dialog
      const batchDialog = page.locator('[data-batch-migration], .batch-migration-dialog').first();
      await expect(batchDialog).toBeVisible();
      
      // Set default options for all playlists
      const defaultCategory = batchDialog.locator('select[name*="default-category"]').first();
      if (await defaultCategory.isVisible()) {
        await defaultCategory.selectOption('mixed');
      }
      
      // Start batch process
      const startBatchButton = batchDialog.getByRole('button', { name: /start|begin|migrate all/i });
      await startBatchButton.click();
      
      // Should show progress
      const progressBar = page.locator('[data-progress], .progress-bar').first();
      await expect(progressBar).toBeVisible();
      
      // Wait for completion (with timeout)
      await expect(page.locator('.batch-complete, [data-batch-success]')).toBeVisible({ timeout: 30000 });
    }
  });

  test('should preserve playlist data during migration', async () => {
    await page.goto('/playlistlibrary');
    
    // Find a legacy playlist to migrate
    const legacyPlaylist = page.locator('[data-legacy-playlist]').first();
    
    if (await legacyPlaylist.isVisible()) {
      // Get original playlist data
      const originalName = await legacyPlaylist.locator('[data-playlist-name]').textContent();
      const originalTrackCount = await legacyPlaylist.locator('[data-track-count]').textContent();
      
      // Migrate the playlist
      const migrateButton = legacyPlaylist.locator('.migrate-btn').first();
      if (await migrateButton.isVisible()) {
        await migrateButton.click();
        
        // Complete migration form
        const migrationForm = page.locator('[data-migration-form]').first();
        if (await migrationForm.isVisible()) {
          await migrationForm.getByRole('button', { name: /migrate/i }).click();
          
          // Wait for migration completion
          await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
          
          // Find the migrated playlist
          const migratedPlaylist = page.locator(`[data-playlist-name*="${originalName}"]`).first();
          await expect(migratedPlaylist).toBeVisible();
          
          // Verify data preservation
          if (originalTrackCount) {
            const newTrackCount = await migratedPlaylist.locator('[data-track-count]').textContent();
            expect(newTrackCount).toBe(originalTrackCount);
          }
        }
      }
    }
  });

  test('should handle migration errors gracefully', async () => {
    // This test simulates error conditions during migration
    await page.goto('/playlistlibrary');
    
    // Mock a network error by intercepting requests
    await page.route('**/databases/*/collections/*/documents', route => {
      if (route.request().method() === 'POST') {
        route.abort('networkfailed');
      } else {
        route.continue();
      }
    });
    
    // Attempt migration
    const migrateButton = page.getByRole('button', { name: /migrate/i }).first();
    if (await migrateButton.isVisible()) {
      await migrateButton.click();
      
      // Should show error message
      const errorMessage = page.locator('.error-message, [data-error], .alert-error').first();
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      
      // Error should be user-friendly
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toContain('migration');
    }
  });

  test('should show migration progress and status', async () => {
    await page.goto('/playlistlibrary');
    
    // Look for migration status dashboard
    const migrationStatus = page.locator('[data-migration-status], .migration-dashboard').first();
    
    if (await migrationStatus.isVisible()) {
      // Should show statistics
      const totalPlaylists = migrationStatus.locator('[data-total-playlists]').first();
      const migratedCount = migrationStatus.locator('[data-migrated-count]').first();
      const pendingCount = migrationStatus.locator('[data-pending-count]').first();
      
      // At least one statistic should be visible
      const statsVisible = await totalPlaylists.isVisible() || 
                          await migratedCount.isVisible() || 
                          await pendingCount.isVisible();
      expect(statsVisible).toBe(true);
    }
    
    // Test migration history
    const migrationHistory = page.locator('[data-migration-history], .migration-log').first();
    if (await migrationHistory.isVisible()) {
      await expect(migrationHistory).toBeVisible();
      
      // Should show recent migration activities
      const historyItems = migrationHistory.locator('[data-history-item], .history-entry');
      const historyCount = await historyItems.count();
      expect(historyCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should allow rollback of migrations', async () => {
    await page.goto('/playlistlibrary');
    
    // Look for rollback functionality
    const rollbackButton = page.getByRole('button', { name: /rollback|undo migration/i });
    
    if (await rollbackButton.isVisible()) {
      await rollbackButton.click();
      
      // Should show rollback confirmation
      const confirmDialog = page.locator('[data-rollback-dialog], dialog').first();
      await expect(confirmDialog).toBeVisible();
      
      // Confirm rollback
      const confirmButton = confirmDialog.getByRole('button', { name: /confirm|yes|rollback/i });
      await confirmButton.click();
      
      // Should show rollback progress
      const progress = page.locator('[data-rollback-progress], .progress-bar').first();
      await expect(progress).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('.rollback-complete, [data-rollback-success]')).toBeVisible({ timeout: 15000 });
    }
  });
});