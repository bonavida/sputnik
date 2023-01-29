export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: Buffer | string | null;
  path: string;
  duration: number;
}
