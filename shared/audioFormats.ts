/** Formats Chromium plays on every OS (WMA and ALAC are not supported) */
export const AUDIO_MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
} as const;

export type AudioExtension = keyof typeof AUDIO_MIME_TYPES;

export const AUDIO_EXTENSIONS = Object.keys(
  AUDIO_MIME_TYPES
) as AudioExtension[];

export const PLAYLIST_EXTENSIONS = ['.m3u', '.m3u8'] as const;

export const getExtension = (path: string): string => {
  const dot = path.lastIndexOf('.');
  const separator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return dot > separator ? path.slice(dot).toLowerCase() : '';
};

const isAudioExtension = (extension: string): extension is AudioExtension =>
  extension in AUDIO_MIME_TYPES;

export const isAudioPath = (path: string): boolean =>
  isAudioExtension(getExtension(path));

export const getAudioMimeType = (path: string): string | undefined => {
  const extension = getExtension(path);
  return isAudioExtension(extension) ? AUDIO_MIME_TYPES[extension] : undefined;
};
