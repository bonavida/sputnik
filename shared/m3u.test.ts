import { describe, expect, it } from 'vitest';
import { buildM3u, parseM3u } from './m3u';

describe('buildM3u', () => {
  it('writes the header, the playlist name and one #EXTINF per track', () => {
    const content = buildM3u('Domingo tranquilo', [
      {
        path: 'C:\\Music\\a.mp3',
        title: 'Neon Tide',
        artist: 'Mira',
        duration: 222.4,
      },
      { path: '/music/b.flac', title: 'Sin artista', duration: 61 },
    ]);

    expect(content).toBe(
      [
        '#EXTM3U',
        '#PLAYLIST:Domingo tranquilo',
        '#EXTINF:222,Mira - Neon Tide',
        'C:\\Music\\a.mp3',
        '#EXTINF:61,Sin artista',
        '/music/b.flac',
        '',
      ].join('\n')
    );
  });

  it('uses -1 for unknown durations and keeps names on a single line', () => {
    const content = buildM3u('Line\nbreak', [
      { path: '/a.mp3', title: 'Title\r\nwith break', duration: 0 },
    ]);

    expect(content).toContain('#PLAYLIST:Line break');
    expect(content).toContain('#EXTINF:-1,Title with break');
  });
});

describe('parseM3u', () => {
  it('round-trips what buildM3u writes, including unicode and # in names', () => {
    const tracks = [
      {
        path: '/música/Track #1 100%.mp3',
        title: 'Canción #1',
        artist: 'Ñandú',
        duration: 180,
      },
      { path: 'C:\\Music\\b.mp3', title: 'B', duration: 42 },
    ];

    const parsed = parseM3u(buildM3u('Mi lista', tracks));

    expect(parsed).toEqual({
      name: 'Mi lista',
      entries: [
        {
          location: '/música/Track #1 100%.mp3',
          title: 'Ñandú - Canción #1',
          duration: 180,
        },
        { location: 'C:\\Music\\b.mp3', title: 'B', duration: 42 },
      ],
    });
  });

  it('handles BOM, CRLF, blank lines and comments', () => {
    const content =
      '\uFEFF#EXTM3U\r\n\r\n# a comment\r\n#EXTINF:10,Song\r\nsong.mp3\r\n';

    expect(parseM3u(content).entries).toEqual([
      { location: 'song.mp3', title: 'Song', duration: 10 },
    ]);
  });

  it('accepts plain M3U files without #EXTINF lines', () => {
    expect(parseM3u('a.mp3\nfolder/b.mp3\n').entries).toEqual([
      { location: 'a.mp3' },
      { location: 'folder/b.mp3' },
    ]);
  });

  it('keeps relative paths and file:// URLs untouched for the caller to resolve', () => {
    const content = '../other/a.mp3\nfile:///C:/Music/With%20Space.mp3\n';

    expect(parseM3u(content).entries.map(({ location }) => location)).toEqual([
      '../other/a.mp3',
      'file:///C:/Music/With%20Space.mp3',
    ]);
  });

  it('skips directives between #EXTINF and its path and ignores unknown durations', () => {
    const content =
      '#EXTM3U\n#EXTINF:-1 tvg-id="x",Radio\n#EXTGRP:Group\nradio.mp3\n';

    expect(parseM3u(content).entries).toEqual([
      { location: 'radio.mp3', title: 'Radio', duration: undefined },
    ]);
  });

  it('does not leak #EXTINF info to the next entry', () => {
    const content = '#EXTINF:5,First\na.mp3\nb.mp3\n';

    expect(parseM3u(content).entries[1]).toEqual({ location: 'b.mp3' });
  });

  it('returns no name when the file has no #PLAYLIST directive', () => {
    expect(parseM3u('#EXTM3U\na.mp3').name).toBeUndefined();
  });
});
