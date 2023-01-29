/** Types */
import { SongMetadata } from '@customTypes/metadata';

interface ElectronAPI {
  parseMusicFiles: (filePaths: Array<string>) => Promise<Array<SongMetadata>>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
