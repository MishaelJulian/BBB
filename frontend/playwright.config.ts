import { defineConfig, devices } from '@playwright/test'

// End-to-end smoke tests against a running site (local rehearsal or the Vercel URL):
//   E2E_BASE_URL=http://localhost:3000 npx playwright test
// Admin login test runs only when E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are set.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
})
