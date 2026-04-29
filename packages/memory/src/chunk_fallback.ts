/** 与 `c/src/chunk.c` 同策略的纯 TS 回退实现。 */

function isUtf8Cont(b: number): boolean {
  return (b & 0xc0) === 0x80;
}

function utf8SafeHi(buf: Uint8Array, start: number, maxChunk: number): number {
  let hi = Math.min(start + maxChunk, buf.length);
  while (hi > start && isUtf8Cont(buf[hi - 1]!)) hi--;
  if (hi === start) return Math.min(start + 1, buf.length);
  return hi;
}

function preferBreak(buf: Uint8Array, start: number, hi: number): number {
  for (let i = hi; i > start; i--) {
    if (buf[i - 1] === 10) return i;
  }
  for (let i = hi; i > start; i--) {
    const c = buf[i - 1]!;
    if (c === 32 || c === 9 || c === 13) return i;
  }
  return hi;
}

export function chunkEnd(buf: Uint8Array, start: number, maxChunkBytes: number): number {
  if (start >= buf.length) return buf.length;
  const hi = utf8SafeHi(buf, start, maxChunkBytes);
  if (hi <= start) return Math.min(start + 1, buf.length);
  const br = preferBreak(buf, start, hi);
  if (br <= start) return hi;
  return br;
}

export function chunkUtf8Bytes(buf: Uint8Array, maxChunkBytes: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  let start = 0;
  while (start < buf.length) {
    const end = chunkEnd(buf, start, maxChunkBytes);
    out.push(buf.subarray(start, end));
    start = end;
  }
  return out;
}

export function whitespaceTokenEstimate(buf: Uint8Array): number {
  let n = 0;
  let inTok = false;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i]!;
    const ws = c === 32 || c === 9 || c === 10 || c === 13;
    if (ws) inTok = false;
    else if (!inTok) {
      inTok = true;
      n++;
    }
  }
  return n;
}
