import path from 'node:path';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

// `vite --mode web` runs only the renderer in a browser with a fake bridge (demo mode)
const WEB_MODE = 'web';

const sharedAlias = { '@shared': path.resolve(import.meta.dirname, 'shared') };

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src'), ...sharedAlias },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    mode !== WEB_MODE &&
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: { resolve: { alias: sharedAlias } },
        },
        preload: {
          input: 'electron/preload.ts',
          vite: {
            resolve: { alias: sharedAlias },
            // Sandboxed preloads must be CommonJS; `.cjs` keeps Node from reading them as ESM
            build: {
              rolldownOptions: { output: { entryFileNames: '[name].cjs' } },
            },
          },
        },
      }),
  ],
}));
