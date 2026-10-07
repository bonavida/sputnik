/**
 * Extended M3U (UTF-8, a.k.a. M3U8) build and parse.
 * Pure string handling: resolving relative paths and file:// URLs
 * happens in the main process, where `node:path` is available.
 */

export interface M3uEntry {
  /** Path, relative path or URL exactly as written in the file */
  location: string;
  title?: string;
  /** Seconds; undefined when unknown */
  duration?: number;
}

export interface M3uPlaylist {
  name?: string;
  entries: M3uEntry[];
}

export interface M3uTrack {
  path: string;
  title: string;
  artist?: string;
  duration: number;
}

const HEADER = '#EXTM3U';
const EXTINF = '#EXTINF:';
const PLAYLIST = '#PLAYLIST:';
const UNKNOWN_DURATION = -1;
const BOM = '﻿';

// Line breaks would corrupt the line-based format
const singleLine = (text: string): string => text.replace(/[\r\n]+/g, ' ');

const formatTitle = ({ title, artist }: M3uTrack): string =>
  singleLine(artist ? `${artist} - ${title}` : title);

const formatDuration = (duration: number): number =>
  Number.isFinite(duration) && duration > 0
    ? Math.round(duration)
    : UNKNOWN_DURATION;

export const buildM3u = (name: string, tracks: M3uTrack[]): string =>
  [
    HEADER,
    `${PLAYLIST}${singleLine(name)}`,
    ...tracks.flatMap((track) => [
      `${EXTINF}${formatDuration(track.duration)},${formatTitle(track)}`,
      track.path,
    ]),
  ].join('\n') + '\n';

type EntryInfo = Omit<M3uEntry, 'location'>;

interface ParseState {
  name?: string;
  entries: M3uEntry[];
  pending?: EntryInfo;
}

const parseExtinf = (line: string): EntryInfo => {
  const info = line.slice(EXTINF.length);
  const comma = info.indexOf(',');
  const rawDuration = comma === -1 ? info : info.slice(0, comma);
  // The duration may be followed by attributes: `#EXTINF:123 tvg-id="x",Title`
  const duration = Number.parseFloat(rawDuration);
  const title = comma === -1 ? '' : info.slice(comma + 1).trim();
  return {
    duration: Number.isFinite(duration) && duration >= 0 ? duration : undefined,
    title: title || undefined,
  };
};

export const parseM3u = (content: string): M3uPlaylist => {
  const lines = content
    .replace(BOM, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // The accumulator is local, so mutating it keeps parsing linear for big lists
  const { name, entries } = lines.reduce<ParseState>(
    (state, line) => {
      if (line.startsWith(EXTINF)) {
        state.pending = parseExtinf(line);
        return state;
      }
      if (line.startsWith(PLAYLIST)) {
        state.name = line.slice(PLAYLIST.length).trim() || state.name;
        return state;
      }
      // Other directives (#EXTGRP, comments…) may sit between #EXTINF and its path
      if (line.startsWith('#')) return state;
      state.entries.push({ location: line, ...state.pending });
      state.pending = undefined;
      return state;
    },
    { entries: [] }
  );

  return { name, entries };
};
