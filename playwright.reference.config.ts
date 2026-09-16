import { defineConfig, devices } from '@playwright/test';

const referenceUrl = process.env.REFERENCE_BASE_URL ?? '';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(referenceUrl)) {
  throw new Error('La captura de referencia exige REFERENCE_BASE_URL en loopback.');
}

export default defineConfig({
  testDir: './tests/visual',
  timeout: 5 * 60 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: referenceUrl,
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
});
