import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@vd/shared': path.resolve(__dirname, './packages/shared/src/index.ts')
    }
  }
});
