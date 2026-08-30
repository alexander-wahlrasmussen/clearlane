/// <reference types="node" />
import { defineConfig } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  // CI runners are slow to first paint; locally keep the tight default.
  expect: { timeout: CI ? 10_000 : 5_000 },
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    // Locally the dev server. In CI the built bundle — it is what gets
    // published, and a cold dev server on a shared runner takes longer than
    // any sensible expectation timeout to compile the first page.
    command: CI ? 'npm run build && npx vite preview --port 5173 --strictPort' : 'npm run dev',
    port: 5173,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
