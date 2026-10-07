/** Inclusive byte range, as in `Content-Range: bytes start-end/size` */
export interface ByteRange {
  start: number;
  end: number;
}

export type RangeResult =
  | { kind: 'full' }
  | { kind: 'partial'; range: ByteRange }
  | { kind: 'unsatisfiable' };

const FULL: RangeResult = { kind: 'full' };
const UNSATISFIABLE: RangeResult = { kind: 'unsatisfiable' };
const SINGLE_RANGE = /^bytes=(\d*)-(\d*)$/;

/**
 * Parses a `Range` header following RFC 9110: syntactically invalid or
 * multi-range headers are ignored (full response) and ranges that start past
 * the end of the file are unsatisfiable (416).
 */
export const parseRange = (
  header: string | null,
  size: number
): RangeResult => {
  const match = header ? SINGLE_RANGE.exec(header.trim()) : null;
  if (!match) return FULL;

  const [, rawStart = '', rawEnd = ''] = match;
  if (!rawStart && !rawEnd) return FULL;

  // Suffix range: the last N bytes
  if (!rawStart) {
    const length = Number(rawEnd);
    if (length === 0 || size === 0) return UNSATISFIABLE;
    return {
      kind: 'partial',
      range: { start: Math.max(0, size - length), end: size - 1 },
    };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : Number.POSITIVE_INFINITY;
  if (end < start) return FULL;
  if (start >= size) return UNSATISFIABLE;
  return { kind: 'partial', range: { start, end: Math.min(end, size - 1) } };
};
