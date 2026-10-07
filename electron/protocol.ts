import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { getAudioMimeType } from '@shared/audioFormats';
import { PROTOCOL_HOST } from '@shared/constants';
import { COVER_FILE_NAME, COVER_MIME_TYPES } from './covers';
import type { ByteRange } from './range';
import { parseRange } from './range';

const APP_MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const OCTET_STREAM = 'application/octet-stream';
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Production CSP; dev runs on Vite's server, which needs inline scripts for HMR */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: sputnik:",
  'media-src sputnik:',
  "font-src 'self'",
  // The renderer fetches covers to hand them to the OS media controls
  "connect-src 'self' sputnik:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

interface ProtocolOptions {
  resolveMedia: (id: string) => string | undefined;
  coversDir: string;
  appDir: string;
}

type HostHandler = (name: string, request: Request) => Promise<Response>;

const empty = (status: number, headers?: Record<string, string>) =>
  new Response(null, { status, headers });

const fileStream = (filePath: string, range?: ByteRange) =>
  Readable.toWeb(
    createReadStream(filePath, range)
  ) as ReadableStream<Uint8Array>;

const isInside = (dir: string, filePath: string) =>
  filePath.startsWith(dir + path.sep);

/**
 * Handler for `sputnik://`:
 * - `app/<file>`: the built renderer (production only)
 * - `media/<track id>`: audio files, only those imported in this session (allowlist), with Range support
 * - `cover/<sha1>.<ext>`: cached album art
 */
export const createProtocolHandler = ({
  resolveMedia,
  coversDir,
  appDir,
}: ProtocolOptions) => {
  const appRoot = path.resolve(appDir);

  const serveMedia: HostHandler = async (id, request) => {
    const filePath = resolveMedia(id);
    if (!filePath) return empty(403);

    const stats = await stat(filePath).catch(() => undefined);
    if (!stats?.isFile()) return empty(404);

    const { size } = stats;
    const headers = {
      'Content-Type': getAudioMimeType(filePath) ?? OCTET_STREAM,
      'Accept-Ranges': 'bytes',
    };
    const range = parseRange(request.headers.get('range'), size);
    const withBody = request.method !== 'HEAD';

    if (range.kind === 'unsatisfiable') {
      return empty(416, { ...headers, 'Content-Range': `bytes */${size}` });
    }
    if (range.kind === 'full') {
      return new Response(withBody ? fileStream(filePath) : null, {
        status: 200,
        headers: { ...headers, 'Content-Length': String(size) },
      });
    }

    const { start, end } = range.range;
    return new Response(withBody ? fileStream(filePath, range.range) : null, {
      status: 206,
      headers: {
        ...headers,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`,
      },
    });
  };

  const serveCover: HostHandler = async (fileName) => {
    if (!COVER_FILE_NAME.test(fileName)) return empty(404);
    const data = await readFile(path.join(coversDir, fileName)).catch(
      () => undefined
    );
    if (!data) return empty(404);
    const extension = path.extname(fileName).slice(1);
    return new Response(data, {
      headers: {
        'Content-Type': COVER_MIME_TYPES[extension] ?? OCTET_STREAM,
        'Cache-Control': IMMUTABLE,
        // Content-addressed album art: safe to read from any origin (dev server included)
        'Access-Control-Allow-Origin': '*',
      },
    });
  };

  const serveApp: HostHandler = async (relativePath) => {
    const filePath = path.resolve(appRoot, relativePath || 'index.html');
    if (!isInside(appRoot, filePath)) return empty(403);
    const data = await readFile(filePath).catch(() => undefined);
    if (!data) return empty(404);
    const extension = path.extname(filePath);
    return new Response(data, {
      headers: {
        'Content-Type': APP_MIME_TYPES[extension] ?? OCTET_STREAM,
        ...(extension === '.html' && {
          'Content-Security-Policy': CONTENT_SECURITY_POLICY,
        }),
      },
    });
  };

  const handlers: Record<string, HostHandler> = {
    [PROTOCOL_HOST.media]: serveMedia,
    [PROTOCOL_HOST.cover]: serveCover,
    [PROTOCOL_HOST.app]: serveApp,
  };

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const handler = handlers[url.host];
    if (!handler) return empty(404);
    const name = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    return handler(name, request);
  };
};
