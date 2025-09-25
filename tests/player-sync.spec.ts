import { test, expect } from '@playwright/test';

test('Test player status sync without errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('❌ Console Error:', msg.text());
    }
  });

  // Capture network errors (404, 409, etc.)
  page.on('response', response => {
    if (response.status() === 404 || response.status() === 409) {
      const error = `${response.status()} ${response.url()}`;
      networkErrors.push(error);
      console.log('🌐 Network Error:', error);
    }
  });

  try {
    console.log('🎭 Testing player status synchronization...');
    
    // Navigate to videoplayer page
    await page.goto('http://localhost:5175/videoplayer', { 
      waitUntil: 'networkidle',
      timeout: 10000
    });
    
    console.log('📺 Video player loaded, waiting for status sync...');
    
    // Wait for status synchronization to occur
    await page.waitForTimeout(3000);
    
    // Try to trigger a status change by interacting with the page
    await page.evaluate(() => {
      // Simulate a status change that would trigger syncStatusToAppwrite
      const playerStatusGlobal = (window as any).playerStatus;
      if (playerStatusGlobal && playerStatusGlobal.setStatus) {
        playerStatusGlobal.setStatus({
          status: 'connected-local-playing',
          last_updated: new Date().toISOString()
        });
      }
    }).catch(() => {
      console.log('⚠️ Could not trigger manual status change (expected)');
    });
    
    // Wait for any async operations to complete
    await page.waitForTimeout(2000);
    
    console.log('\n📊 Test Results:');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Network Errors (404/409): ${networkErrors.length}`);
    
    if (networkErrors.length > 0) {
      console.log('\n❌ Network Errors Found:');
      networkErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Found:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    
    // Expect no 404 or 409 errors
    expect(networkErrors.length).toBe(0);
    
    console.log('✅ Player status sync test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
});