import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: 'npm run start -- --port 3100',
    url: 'http://127.0.0.1:3100/api/state',
    reuseExistingServer: false,
    env: { PORSI_MODE: 'demo', PORSI_DATA_DIR: resolve('tmp/e2e-data', String(process.pid) + '-' + Date.now()), PORSI_COOKIE_INSECURE: 'true', APP_ORIGIN: 'http://127.0.0.1:3100', DEMO_ADMIN_EMAIL: 'admin@porsiloop.local', DEMO_ADMIN_PASSWORD: 'PorsiAdmin2026!', DEMO_SELLER_EMAIL: 'seller@porsiloop.local', DEMO_SELLER_PASSWORD: 'PorsiSeller2026!', DEMO_STUDENT_EMAIL: 'student@porsiloop.local', DEMO_STUDENT_PASSWORD: 'PorsiStudent2026!' },
  },
});
