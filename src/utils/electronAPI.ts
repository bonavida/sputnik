/** Types */
import { SongMetadata } from '@customTypes/metadata';

const { electronAPI } = window;

export const parseMusicFiles = (
  filePaths: Array<string>
): Promise<Array<SongMetadata>> => electronAPI.parseMusicFiles(filePaths);
