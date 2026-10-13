import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'rm -rf tmp/e2e-data && node server.mjs',
    url: 'http://127.0.0.1:4173/health',
    env: { PORT: '4173', DATA_DIR: 'tmp/e2e-data', ADMIN_PASSWORD: 'e2e-only-password-0000' },
    reuseExistingServer: false,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
