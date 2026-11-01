import { defineConfig } from '@playwright/test';
const remote = process.env.PAGES_DEMO_URL;
export default defineConfig({
  testDir: './e2e-pages',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: remote || 'http://127.0.0.1:4173/Airline-Reservation-Systemm/',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : {}),
  },
  ...(!remote
    ? {
        webServer: {
          command:
            'npm run preview -- --mode pages --host 127.0.0.1 --port 4173 --strictPort',
          url: 'http://127.0.0.1:4173/Airline-Reservation-Systemm/',
          reuseExistingServer: false,
        },
      }
    : {}),
});
