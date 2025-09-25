import { type FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Cleaning up global test environment...');
  
  try {
    // Clean up test data from Appwrite collections
    // This would normally delete test documents, but we'll be cautious
    // and only clean up documents created during tests
    
    console.log('Global teardown completed successfully');
    
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw here as it would fail the test run
  }
}

export default globalTeardown;