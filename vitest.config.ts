import path from 'node:path';
import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const NODE_TESTS = [
  'shared/**/*.test.ts',
  'electron/**/*.test.ts',
  'src/lib/**/*.test.ts',
  'src/i18n/**/*.test.ts',
];

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
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: NODE_TESTS,
          setupFiles: ['src/test/setup.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/queue.ts',
        'src/lib/color.ts',
        'shared/m3u.ts',
        'shared/guards.ts',
        'electron/range.ts',
        'electron/dominantColor.ts',
      ],
      thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
    },
  },
});
