import { chromium, type FullConfig } from '@playwright/test';
import { Client, Account, Databases } from 'appwrite';

async function globalSetup(config: FullConfig) {
  console.log('Setting up global test environment...');
  
  // Start browser for initial setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Initialize Appwrite client for test cleanup and setup
    const client = new Client()
      .setEndpoint(process.env.PUBLIC_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
      .setProject(process.env.PUBLIC_APPWRITE_PROJECT_ID || '68cc86c3002b27e13947');
    
    const account = new Account(client);
    const databases = new Databases(client);
    
    // Store test environment variables
    process.env.TEST_USER_EMAIL = 'djamms.test@example.com';
    process.env.TEST_USER_PASSWORD = 'DjammsTest2024!';
    
    console.log('Global setup completed successfully');
    
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;