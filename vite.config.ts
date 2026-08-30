/// <reference types="node" />
/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Short commit for the build stamp; CI has no .git history depth, so fall back to GITHUB_SHA. */
function commit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return (process.env.GITHUB_SHA ?? '').slice(0, 7) || 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  // Set BASE_PATH=/repo-name/ when publishing under a sub-path (GitHub Pages).
  base: process.env.BASE_PATH ?? '/',
  define: {
    __BUILD_INFO__: JSON.stringify({
      commit: commit(),
      builtAt: `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    }),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
