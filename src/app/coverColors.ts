import { COVER_COLOR_VERSION, coverFileOf } from '@shared/constants';
import type { Track } from '@shared/types';
import { bridge } from '@/bridge/bridge';
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';

const isOutdated = (track: Track) =>
  track.coverUrl !== undefined && track.colorVersion !== COVER_COLOR_VERSION;

const coverFile = (track: Track) =>
  track.coverUrl === undefined ? undefined : coverFileOf(track.coverUrl);

/**
 * Songs keep the cover color computed when they were imported. When the color
 * algorithm improves (COVER_COLOR_VERSION), their colors are recalculated once
 * from the cached covers, in the queue and in saved playlists alike.
 */
export const refreshCoverColors = async (): Promise<void> => {
  const tracks = [
    ...usePlayerStore.getState().queue.entries.map(({ track }) => track),
    ...usePlaylistsStore
      .getState()
      .playlists.flatMap(({ tracks: list }) => list),
  ];
  const fileNames = [
    ...new Set(
      tracks.filter(isOutdated).flatMap((track) => coverFile(track) ?? [])
    ),
  ];
  if (fileNames.length === 0) return;

  const results = await bridge()
    .coverColors(fileNames)
    .catch(() => []);
  if (results.length === 0) return;

  const colors = new Map(
    results.map(({ fileName, color }) => [fileName, color])
  );
  const refresh = (track: Track): Track => {
    const file = coverFile(track);
    if (!isOutdated(track) || file === undefined || !colors.has(file))
      return track;
    return {
      ...track,
      color: colors.get(file),
      colorVersion: COVER_COLOR_VERSION,
    };
  };

  usePlayerStore.setState(({ queue }) => ({
    queue: {
      ...queue,
      entries: queue.entries.map((entry) => ({
        ...entry,
        track: refresh(entry.track),
      })),
    },
  }));
  usePlaylistsStore.setState(({ playlists }) => ({
    playlists: playlists.map((playlist) => ({
      ...playlist,
      tracks: playlist.tracks.map(refresh),
    })),
  }));
};
