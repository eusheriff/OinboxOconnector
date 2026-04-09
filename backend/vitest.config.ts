import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Cloudflare Workers run in a V8-like env, 'node' is closer than 'jsdom'
    include: ['backend/test/**/*.test.ts'],
    exclude: ['src/**/*', 'node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['backend/src/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
