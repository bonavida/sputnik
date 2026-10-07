import { describe, expect, it } from 'vitest';
import { networkHost, resolveM3uLocations } from './m3uFiles';

const isWindows = process.platform === 'win32';

describe('networkHost', () => {
  it.each([
    ['\\\\attacker.example\\music\\a.mp3', 'attacker.example'],
    ['//attacker.example/music/a.mp3', 'attacker.example'],
    ['\\\\?\\UNC\\Attacker.Example\\music\\a.mp3', 'attacker.example'],
    ['\\\\.\\UNC\\nas\\music\\a.mp3', 'nas'],
  ])('%s is on %s', (filePath, host) => {
    expect(networkHost(filePath)).toBe(host);
  });

  it.each([
    'C:\\Music\\a.mp3',
    '/home/me/a.mp3',
    'music/a.mp3',
    '\\\\?\\C:\\Music\\a.mp3',
  ])('%s is local', (filePath) => {
    expect(networkHost(filePath)).toBeUndefined();
  });
});

describe('resolveM3uLocations', () => {
  // A network path makes Windows authenticate to that server with the user's
  // NTLM credentials, so a downloaded playlist must not choose the server.
  // Elsewhere these are plain local file names, so the test is Windows only
  it.runIf(isWindows)('never resolves paths on another network server', () => {
    const locations = [
      '\\\\attacker.example\\music\\a.mp3',
      '//attacker.example/music/b.mp3',
      'file://attacker.example/music/c.mp3',
      '\\\\?\\UNC\\attacker.example\\music\\d.mp3',
    ];

    const { paths, unsupported } = resolveM3uLocations(
      locations,
      'C:\\Users\\me\\list.m3u8'
    );

    expect(paths).toEqual([]);
    expect(unsupported).toEqual(locations);
  });

  it('never resolves file URLs that name a server', () => {
    const location = 'file://attacker.example/music/a.mp3';

    const { paths, unsupported } = resolveM3uLocations(
      [location],
      isWindows ? 'C:\\Users\\me\\list.m3u8' : '/home/me/list.m3u8'
    );

    expect(paths).toEqual([]);
    expect(unsupported).toEqual([location]);
  });

  it.runIf(isWindows)(
    'keeps paths on the server the playlist was opened from',
    () => {
      const { paths, unsupported } = resolveM3uLocations(
        ['a.mp3', '\\\\NAS\\music\\b.mp3', '\\\\other\\music\\c.mp3'],
        '\\\\nas\\music\\list.m3u8'
      );

      expect(paths).toEqual(['\\\\nas\\music\\a.mp3', '\\\\NAS\\music\\b.mp3']);
      expect(unsupported).toEqual(['\\\\other\\music\\c.mp3']);
    }
  );

  it('still resolves local relative paths and local file URLs', () => {
    const local = isWindows ? 'file:///C:/Music/a.mp3' : 'file:///music/a.mp3';

    const { paths, unsupported } = resolveM3uLocations(
      [local, 'b.mp3'],
      isWindows ? 'C:\\lists\\x.m3u' : '/lists/x.m3u'
    );

    expect(paths).toHaveLength(2);
    expect(unsupported).toEqual([]);
  });
});
