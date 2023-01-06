import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    outDir: './dist',
    chunkSizeWarningLimit: 1000,
  },
  base: mode === 'development' ? '' : './',
  plugins: [react()],
  server: {
    port: 3000,
  },
}));
