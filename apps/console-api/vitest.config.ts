import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('./src/', import.meta.url));

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
    alias: [
      // `@/...` → src/...
      { find: /^@\/(.*)$/, replacement: `${SRC_DIR}$1` },
    ],
  },
  server: {
    fs: {
      allow: ['.', '..', '../..', '../../..', 'src'],
    },
  },
});