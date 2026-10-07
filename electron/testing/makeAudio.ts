/**
 * Builds tiny but real audio files so integration tests run music-metadata
 * against actual bytes without committing binaries to the repo.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 1×1 PNG; the tests stub image decoding, so any valid PNG works
export const COVER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

export interface Tags {
  title?: string;
  artist?: string;
  album?: string;
  cover?: Buffer;
}

const uint32LE = (value: number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
};

/** ID3v2.4 sizes use 7 bits per byte */
const syncsafe = (value: number) =>
  Buffer.from([
    (value >> 21) & 0x7f,
    (value >> 14) & 0x7f,
    (value >> 7) & 0x7f,
    value & 0x7f,
  ]);

const UTF8 = 0x03;

const id3Frame = (id: string, body: Buffer) =>
  Buffer.concat([
    Buffer.from(id, 'latin1'),
    syncsafe(body.length),
    Buffer.from([0, 0]),
    body,
  ]);

const textFrame = (id: string, text: string) =>
  id3Frame(id, Buffer.concat([Buffer.from([UTF8]), Buffer.from(text, 'utf8')]));

const pictureFrame = (png: Buffer) =>
  id3Frame(
    'APIC',
    Buffer.concat([
      Buffer.from([UTF8]),
      Buffer.from('image/png\0', 'latin1'),
      Buffer.from([0x03]), // front cover
      Buffer.from([0]), // empty description
      png,
    ])
  );

const id3Tag = ({ title, artist, album, cover }: Tags) => {
  const frames = Buffer.concat([
    ...(title ? [textFrame('TIT2', title)] : []),
    ...(artist ? [textFrame('TPE1', artist)] : []),
    ...(album ? [textFrame('TALB', album)] : []),
    ...(cover ? [pictureFrame(cover)] : []),
  ]);
  return Buffer.concat([
    Buffer.from('ID3', 'latin1'),
    Buffer.from([4, 0, 0]),
    syncsafe(frames.length),
    frames,
  ]);
};

// MPEG-1 Layer III, 128 kbps, 44.1 kHz, mono. All-zero side info decodes as silence
const MPEG_FRAME_HEADER = Buffer.from([0xff, 0xfb, 0x90, 0xc4]);
const MPEG_FRAME_SIZE = 417;
const SILENT_FRAMES = 40; // ≈ 1 s

const silentMpegFrames = () =>
  Buffer.concat(
    Array.from({ length: SILENT_FRAMES }, () =>
      Buffer.concat([
        MPEG_FRAME_HEADER,
        Buffer.alloc(MPEG_FRAME_SIZE - MPEG_FRAME_HEADER.length),
      ])
    )
  );

export const mp3 = (tags: Tags = {}): Buffer =>
  Buffer.concat([id3Tag(tags), silentMpegFrames()]);

const riffChunk = (id: string, body: Buffer) => {
  const padding = body.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([
    Buffer.from(id, 'latin1'),
    uint32LE(body.length),
    body,
    padding,
  ]);
};

const SAMPLE_RATE = 8_000;
const BYTES_PER_SAMPLE = 2;

/** 1 s of 16-bit mono PCM silence, with RIFF INFO tags (Latin-1, as in real files) */
export const wav = ({
  title,
  artist,
  album,
}: Omit<Tags, 'cover'> = {}): Buffer => {
  const format = Buffer.alloc(16);
  format.writeUInt16LE(1, 0); // PCM
  format.writeUInt16LE(1, 2); // mono
  format.writeUInt32LE(SAMPLE_RATE, 4);
  format.writeUInt32LE(SAMPLE_RATE * BYTES_PER_SAMPLE, 8);
  format.writeUInt16LE(BYTES_PER_SAMPLE, 12);
  format.writeUInt16LE(16, 14);

  // RIFF INFO text is Latin-1 in practice, which is how music-metadata decodes it
  const infoText = (id: string, text: string) =>
    riffChunk(id, Buffer.from(`${text}\0`, 'latin1'));
  const info = Buffer.concat([
    ...(title ? [infoText('INAM', title)] : []),
    ...(artist ? [infoText('IART', artist)] : []),
    ...(album ? [infoText('IPRD', album)] : []),
  ]);

  const body = Buffer.concat([
    Buffer.from('WAVE', 'latin1'),
    riffChunk('fmt ', format),
    ...(info.length > 0
      ? [
          riffChunk(
            'LIST',
            Buffer.concat([Buffer.from('INFO', 'latin1'), info])
          ),
        ]
      : []),
    riffChunk('data', Buffer.alloc(SAMPLE_RATE * BYTES_PER_SAMPLE)),
  ]);
  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    uint32LE(body.length),
    body,
  ]);
};

/** Writes `content` at `root/relativePath`, creating folders as needed */
export const writeFixture = async (
  root: string,
  relativePath: string,
  content: Buffer | string
) => {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return filePath;
};
