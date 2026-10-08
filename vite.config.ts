import path from 'node:path';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import electron from 'vite-plugin-electron/simple';

// `vite --mode web` runs only the renderer in a browser with a fake bridge (demo mode)
const WEB_MODE = 'web';

const sharedAlias = { '@shared': path.resolve(import.meta.dirname, 'shared') };

// Read from .env.local or the environment (CI secrets); only the main process
// gets them, the renderer never sees the API secret
const lastfmDefines = (mode: string) => {
  const env = loadEnv(mode, import.meta.dirname, 'LASTFM_');
  return {
    BUILD_LASTFM_API_KEY: JSON.stringify(env.LASTFM_API_KEY ?? ''),
    BUILD_LASTFM_API_SECRET: JSON.stringify(env.LASTFM_API_SECRET ?? ''),
  };
};

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src'), ...sharedAlias },
  },
  server: {
    // On Windows a watched folder cannot be renamed: without this, packaging
    // while `pnpm dev` runs fails with EPERM inside release/
    watch: {
      ignored: ['**/release/**', '**/dist-electron/**', '**/coverage/**'],
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    mode !== WEB_MODE &&
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            resolve: { alias: sharedAlias },
            define: lastfmDefines(mode),
          },
          // The plugin adds --no-sandbox by default; keep the OS sandbox in dev too
          onstart: ({ startup }) => {
            void startup(['.']);
          },
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
