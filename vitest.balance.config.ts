import { defineConfig } from 'vitest/config';

// Full headless bot runs; slow, so kept out of the default `npm test`.
export default defineConfig({
  test: { include: ['tests/balance/**/*.test.ts'], environment: 'node', testTimeout: 1_200_000 },
});
