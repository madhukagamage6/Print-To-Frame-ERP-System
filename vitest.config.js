import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Unit and integration tests are separate npm scripts (see package.json) since
    // integration tests require the Firebase Emulator Suite running underneath them
    // and would otherwise fail with a confusing connection error if run bare.
  },
});
