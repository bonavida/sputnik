import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SETTINGS } from '@shared/constants';
import type { PersistedState, Track } from '@shared/types';
import { App } from '@/App';
import { boot } from '@/app/boot';
import { setBridge } from '@/bridge/bridge';
import { createMemoryBridge } from '@/bridge/memoryBridge';
import type { MemoryBridge, MemoryFile } from '@/bridge/memoryBridge';
import { FakeAudio, createFakeMediaSession } from './fakeAudio';
import type { FakeMediaSession } from './fakeAudio';

const teardowns: Array<() => void> = [];

/** Stops the audio engines and persistence started by renderApp */
export const runTeardowns = (): void => {
  teardowns.splice(0).forEach((teardown) => teardown());
  setBridge(undefined);
};

export const makeTrack = (
  number: number,
  overrides: Partial<Track> = {}
): Track => ({
  id: `t${number}`,
  path: `/music/${number}.mp3`,
  title: `Song ${number}`,
  artist: `Artist ${number}`,
  album: 'Album',
  duration: 180,
  ...overrides,
});

export const makeTracks = (count: number): Track[] =>
  Array.from({ length: count }, (_, index) => makeTrack(index + 1));

interface TestBridgeOptions {
  tracks?: Track[];
  extraFiles?: Record<string, MemoryFile>;
  folders?: Record<string, string[]>;
  state?: Partial<PersistedState>;
}

/** Memory bridge in Spanish with `tracks` available on "disk" */
export const createTestBridge = ({
  tracks = [],
  extraFiles = {},
  folders = {},
  state = {},
}: TestBridgeOptions = {}) =>
  createMemoryBridge({
    folders,
    files: {
      ...Object.fromEntries(tracks.map((track) => [track.path, track])),
      ...extraFiles,
    },
    state: {
      ...state,
      settings: { ...DEFAULT_SETTINGS, locale: 'es', ...state.settings },
    },
  });

interface RenderAppOptions {
  bridge?: MemoryBridge;
  audio?: FakeAudio;
  mediaSession?: FakeMediaSession;
}

/** Queue row whose title is exactly `title` */
export const getRow = (title: string): HTMLElement => {
  const match = screen
    .getAllByRole('option')
    .find((option) => within(option).queryByText(title) !== null);
  if (!match) throw new Error(`No queue row titled "${title}"`);
  return match;
};

/** Boots the app exactly like main.tsx, with fakes for the system */
export const renderApp = async ({
  bridge = createTestBridge(),
  audio = new FakeAudio(),
  mediaSession = createFakeMediaSession(),
}: RenderAppOptions = {}) => {
  setBridge(bridge);
  teardowns.push(await boot({ audio, mediaSession }));
  const user = userEvent.setup();
  const view = render(<App />);
  return { ...view, user, bridge, audio, mediaSession };
};
