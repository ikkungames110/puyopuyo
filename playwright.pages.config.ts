import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pages',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4174/puyopuyo/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run preview:pages -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/puyopuyo/',
    reuseExistingServer: false,
  },
});
