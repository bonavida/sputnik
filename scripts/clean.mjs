// Removes build output before a production build. vite-plugin-electron never
// empties dist-electron/, so chunks from dev builds would end up in the asar.
import { rmSync } from 'node:fs';

['dist', 'dist-electron'].forEach((dir) =>
  rmSync(dir, { recursive: true, force: true })
);
