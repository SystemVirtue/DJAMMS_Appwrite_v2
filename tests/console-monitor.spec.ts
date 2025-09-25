import { test, expect } from '@playwright/test';

test('Monitor console errors in DJAMMS player', async ({ page }) => {
  // Capture all console messages
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Capture network errors
  const networkErrors: string[] = [];
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('🎭 Starting DJAMMS application...');
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle' });
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    console.log('📱 Homepage loaded, checking for console messages...');
    if (consoleMessages.length > 0) {
      console.log('Console Messages:');
      consoleMessages.forEach(msg => console.log(`  ${msg}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('Network Errors:');
      networkErrors.forEach(err => console.log(`  ❌ ${err}`));
    }

    // Try to navigate to dashboard (this should trigger auth and player sync)
    console.log('🔄 Attempting to navigate to dashboard...');
    await page.click('text=Connect with Google').catch(() => {
      console.log('Google auth button not found, trying alternative navigation...');
    });
    
    // Wait a bit more for any async operations
    await page.waitForTimeout(3000);
    
    console.log('Final Console Messages:');
    consoleMessages.forEach(msg => console.log(`  ${msg}`));
    
    console.log('Final Network Errors:');
    networkErrors.forEach(err => console.log(`  ❌ ${err}`));
    
    // Try to open video player to trigger the exact error
    console.log('🎬 Testing video player navigation...');
    await page.goto('http://localhost:5175/videoplayer', { waitUntil: 'networkidle' }).catch(e => {
      console.log('Video player direct navigation failed:', e.message);
    });
    
    await page.waitForTimeout(3000);
    
    console.log('Video Player Console Messages:');
    consoleMessages.slice(-10).forEach(msg => console.log(`  ${msg}`));
    
    console.log('Video Player Network Errors:');
    networkErrors.slice(-5).forEach(err => console.log(`  ❌ ${err}`));
    
  } catch (error) {
    console.error('Test error:', error);
  }
  
  console.log(`\n📊 Summary:
  - Total console messages: ${consoleMessages.length}
  - Total console errors: ${consoleErrors.length}
  - Total network errors: ${networkErrors.length}`);
});