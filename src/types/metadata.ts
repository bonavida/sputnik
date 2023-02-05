export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: Uint8Array | undefined;
  path: string;
  duration: number;
}
