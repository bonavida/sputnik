/**
 * Demo data for `pnpm dev:web`: the renderer runs in a plain browser to iterate
 * on the design quickly. URL parameters force each state:
 *   ?theme=system|light|dark  &tint=1|0  &locale=system|es|en
 *   &state=playing|empty|long-names|many
 */
import { DEFAULT_SETTINGS } from '@shared/constants';
import type {
  LocaleSetting,
  PersistedState,
  Rgb,
  ThemeSource,
  Track,
} from '@shared/types';
import { createMemoryBridge } from '@/lib/memoryBridge';
import type { MemoryBridge } from '@/lib/memoryBridge';

interface DemoAlbum {
  album: string;
  artist: string;
  color: Rgb;
  titles: string[];
}

const ALBUMS: DemoAlbum[] = [
  {
    album: 'Low Orbit',
    artist: 'Mira Calder',
    color: [56, 98, 168],
    titles: ['Neon Tide', 'Paper Satellites', 'Quiet Telemetry', 'Apogee'],
  },
  {
    album: 'Shorelines',
    artist: 'The Quiet Arcs',
    color: [196, 98, 64],
    titles: ['Glass Harbor', 'Salt and Static', 'Low Tide Radio'],
  },
  {
    album: 'Perihelion',
    artist: 'Inés Vale',
    color: [92, 148, 108],
    titles: ['Slow Comet', 'Greenhouse', 'Field Notes'],
  },
  {
    album: 'Night Market',
    artist: 'Kofi Brandt',
    color: [168, 72, 140],
    titles: ['Lanterns', 'Second Shift'],
  },
];

const LONG_TEXT =
  'An extremely long title that keeps going to check truncation in every column';
const SILENCE_SECONDS = 30;
const MANY_TRACKS = 500;

const THEMES: readonly ThemeSource[] = ['system', 'light', 'dark'];
const LOCALES: readonly LocaleSetting[] = ['system', 'es', 'en'];

const pick = <Value extends string>(
  options: readonly Value[],
  value: string | null,
  fallback: Value
) => options.find((option) => option === value) ?? fallback;

/** Flat geometric artwork in the album color */
const coverFor = ([r, g, b]: Rgb, seed: number): string => {
  const base = `rgb(${r} ${g} ${b})`;
  const light = `rgb(${Math.min(255, r + 70)} ${Math.min(255, g + 70)} ${Math.min(255, b + 70)})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${base}"/>
    <circle cx="${30 + (seed % 3) * 20}" cy="40" r="22" fill="${light}"/>
    <rect x="18" y="74" width="64" height="4" rx="2" fill="${light}"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const buildTracks = (): Track[] =>
  ALBUMS.flatMap(({ album, artist, color, titles }, albumIndex) =>
    titles.map((title, index) => ({
      id: `demo-${albumIndex}-${index}`,
      path: `/demo/${artist}/${album}/${index + 1} ${title}.mp3`,
      title,
      artist,
      album,
      duration: 150 + ((albumIndex * 7 + index * 13) % 9) * 17,
      coverUrl: coverFor(color, albumIndex),
      color,
    }))
  );

const longNames = (tracks: Track[]): Track[] =>
  tracks.map((track) => ({
    ...track,
    title: `${track.title}: ${LONG_TEXT}`,
    artist: `${track.artist} & ${LONG_TEXT}`,
    album: `${track.album} (${LONG_TEXT})`,
  }));

const many = (tracks: Track[]): Track[] =>
  Array.from({ length: MANY_TRACKS }, (_, index) => {
    const track = tracks[index % tracks.length] as Track;
    return {
      ...track,
      id: `${track.id}-${index}`,
      path: `${track.path}#${index}`,
    };
  });

/** A short silent WAV so play, pause and seek work without real files */
const silentWavUrl = (): string => {
  const sampleRate = 8_000;
  const dataSize = sampleRate * SILENCE_SECONDS * 2;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const text = (offset: number, value: string) =>
    [...value].forEach((char, index) =>
      view.setUint8(offset + index, char.charCodeAt(0))
    );

  text(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataSize, true);
  return URL.createObjectURL(new Blob([view.buffer], { type: 'audio/wav' }));
};

const QUEUES: Record<string, (tracks: Track[]) => Track[]> = {
  playing: (tracks) => tracks,
  'long-names': longNames,
  many,
};

export const createDemoBridge = (params: URLSearchParams): MemoryBridge => {
  const tracks = buildTracks();
  const queueOf = QUEUES[params.get('state') ?? 'playing'];
  const queue = queueOf?.(tracks) ?? [];
  const silence = silentWavUrl();

  const state: PersistedState = {
    settings: {
      ...DEFAULT_SETTINGS,
      theme: pick(THEMES, params.get('theme'), 'system'),
      locale: pick(LOCALES, params.get('locale'), 'system'),
      albumTint: params.get('tint') !== '0',
    },
    playlists: [
      {
        id: 'demo-sunday',
        name: 'Domingo tranquilo',
        tracks: tracks.slice(0, 5),
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'demo-focus',
        name: 'Para concentrarse',
        tracks: tracks.slice(5),
        createdAt: 0,
        updatedAt: 0,
      },
    ],
    session: queue.length > 0 ? { queue, currentIndex: 1 } : undefined,
  };

  const bridge = createMemoryBridge({
    files: Object.fromEntries(
      [...tracks, ...queue].map((track) => [track.path, track])
    ),
    folders: { '/demo': tracks.map(({ path }) => path) },
    state,
    mediaUrl: () => silence,
  });
  bridge.dialogs.files = tracks.slice(0, 3).map(({ path }) => path);
  bridge.dialogs.folder = ['/demo'];
  return bridge;
};
