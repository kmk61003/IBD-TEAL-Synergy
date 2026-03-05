// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright E2E test configuration.
 * Tests run against the local dev server or a pre-started server in CI.
 */
module.exports = defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Mobile-first viewport
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the server if not already running
  webServer: process.env.CI ? undefined : {
    command: 'node server.js',
    url: 'http://localhost:3000/healthz',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      NODE_ENV: 'test',
      SESSION_SECRET: 'e2e-test-session-secret-min-32-chars',
      CSRF_SECRET: 'e2e-test-csrf-secret-min-32-chars!!',
      DEV_SKIP_EMAIL_VERIFY: 'true',
      PAYMENT_PROVIDER: 'razorpay',
    },
  },
});
