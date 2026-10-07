import path from 'node:path';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const NODE_TESTS = [
  'shared/**/__tests__/*.test.ts',
  'electron/**/__tests__/*.test.ts',
  'src/utils/**/__tests__/*.test.ts',
  'src/i18n/**/__tests__/*.test.ts',
];

// Everything else in src/ runs in jsdom. Kept disjoint from NODE_TESTS with an
// include instead of an exclude: a project's own exclude replaces the CLI
// --exclude that `test:unit` relies on, which let integration tests through
const RENDERER_TESTS = [
  'src/__tests__/*.test.{ts,tsx}',
  'src/!(utils|i18n)/**/__tests__/*.test.{ts,tsx}',
];

// Renderer integration tests boot the whole app and type key by key: about 1 s
// locally, but over the 5 s default on a busy GitHub Windows runner
const RENDERER_TEST_TIMEOUT_MS = 20_000;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: NODE_TESTS },
      },
      {
        extends: true,
        plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
        test: {
          name: 'renderer',
          environment: 'jsdom',
          include: RENDERER_TESTS,
          setupFiles: ['src/testing/setup.ts'],
          testTimeout: RENDERER_TEST_TIMEOUT_MS,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/utils/queue.ts',
        'src/utils/color.ts',
        'src/utils/slider.ts',
        'shared/m3u.ts',
        'shared/guards.ts',
        'electron/protocol/range.ts',
        'electron/library/dominantColor.ts',
      ],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
