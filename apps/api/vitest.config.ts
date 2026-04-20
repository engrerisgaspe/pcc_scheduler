/**
 * Vitest Configuration
 * Unit and integration test setup for backend services
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/__tests__/',
      ],
    },
    testMatch: ['**/__tests__/**/*.test.ts'],
  },
});
