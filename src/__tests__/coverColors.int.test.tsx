import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COVER_COLOR_VERSION, coverUrl } from '@shared/constants';
import type { Rgb } from '@shared/types';
import { createTestBridge, makeTrack, renderApp } from '@/testing/renderApp';

const OLD_COVER = `${'a'.repeat(40)}.jpg`;
const CURRENT_COVER = `${'b'.repeat(40)}.jpg`;
const PINKISH: Rgb = [210, 144, 138];
const GREEN: Rgb = [67, 111, 58];

// Imported before the color algorithm improved: no colorVersion
const oldTrack = makeTrack(1, {
  coverUrl: coverUrl(OLD_COVER),
  color: PINKISH,
});
const currentTrack = makeTrack(2, {
  coverUrl: coverUrl(CURRENT_COVER),
  color: [10, 20, 200],
  colorVersion: COVER_COLOR_VERSION,
});
const tracks = [oldTrack, currentTrack];

const setup = () => {
  const bridge = createTestBridge({
    tracks,
    state: {
      playlists: [
        { id: 'saved', name: 'Guardada', tracks, createdAt: 1, updatedAt: 1 },
      ],
      session: { queue: tracks, playlistId: 'saved', playlistName: 'Guardada' },
    },
  });
  bridge.covers = { [OLD_COVER]: GREEN, [CURRENT_COVER]: [10, 20, 200] };
  return renderApp({ bridge });
};

describe('cover colors from an older algorithm', () => {
  it('are recalculated once from the cached covers and saved', async () => {
    const { bridge } = await setup();

    await waitFor(() =>
      expect(bridge.state.session?.queue[0]).toMatchObject({
        color: GREEN,
        colorVersion: COVER_COLOR_VERSION,
      })
    );
    expect(bridge.state.playlists[0]?.tracks[0]).toMatchObject({
      color: GREEN,
      colorVersion: COVER_COLOR_VERSION,
    });
    // Only the outdated cover was asked for
    expect(bridge.calls.coverColors).toEqual([[OLD_COVER]]);
  });

  it('do not mark the saved playlist as changed', async () => {
    const { bridge } = await setup();

    await waitFor(() =>
      expect(bridge.state.session?.queue[0]?.colorVersion).toBe(
        COVER_COLOR_VERSION
      )
    );
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument();
  });

  it('stay as they are when the cover is no longer cached', async () => {
    const bridge = createTestBridge({
      tracks,
      state: { session: { queue: tracks } },
    });
    await renderApp({ bridge });

    await waitFor(() => expect(bridge.calls.coverColors).toHaveLength(1));
    expect(bridge.state.session?.queue[0]?.color).toEqual(PINKISH);
  });
});
