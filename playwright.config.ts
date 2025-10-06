import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
  },

  /* Configure the development server to start automatically */
  //   command: 'npm run dev -- --port 5174',
  //   port: 5174,
  //   reuseExistingServer: true, // Always reuse if available
  //   stdout: 'ignore',
  //   stderr: 'pipe',
  //   timeout: 120000, // 2 minutes timeout
  // },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-headed',
      use: { 
        ...devices['Desktop Chrome'],
        headless: false, // Run headed for visual verification
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5174',
  //   reuseExistingServer: true,
  //   timeout: 120000,
  // },

  /* Global setup for authentication and test data */
  globalSetup: './tests/global-setup.ts',

  /* Global teardown to clean up test data */
  globalTeardown: './tests/global-teardown.ts',

  /* Test timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});