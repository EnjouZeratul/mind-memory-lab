import { createRequire } from "node:module";
import { chunkUtf8Bytes, whitespaceTokenEstimate } from "./chunk_fallback.js";
import { fnv1a64Hex } from "./fnv.js";

type NativeMod = {
  chunkUtf8Buffers(buf: Buffer, maxChunkBytes: number): Buffer[];
  fnv1a64Hex(buf: Buffer): string;
  whitespaceTokenEstimate(buf: Buffer): number;
} | null;

const require = createRequire(import.meta.url);

function loadNative(): NativeMod {
  try {
    const m = require("@mind/native-mindmem") as NativeMod | null;
    if (m != null && typeof m.chunkUtf8Buffers === "function") return m;
    return null;
  } catch {
    return null;
  }
}

const native = loadNative();

export function chunkUtf8(buf: Uint8Array, maxChunkBytes: number): Uint8Array[] {
  if (native) {
    const nodeBuf = Buffer.from(buf);
    const parts = native.chunkUtf8Buffers(nodeBuf, maxChunkBytes);
    return parts.map((b) => new Uint8Array(b));
  }
  return chunkUtf8Bytes(buf, maxChunkBytes);
}

export function fingerprintHex(buf: Uint8Array): string {
  if (native) return native.fnv1a64Hex(Buffer.from(buf));
  return fnv1a64Hex(buf);
}

export function approxTokenCount(buf: Uint8Array): number {
  if (native) return Math.floor(native.whitespaceTokenEstimate(Buffer.from(buf)));
  return whitespaceTokenEstimate(buf);
}
