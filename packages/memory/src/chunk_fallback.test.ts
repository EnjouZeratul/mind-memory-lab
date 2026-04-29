import assert from "node:assert/strict";
import test from "node:test";
import { chunkUtf8Bytes, chunkEnd } from "./chunk_fallback.js";
import { chunkUtf8 } from "./native_chunk.js";

test("chunkEnd advances", () => {
  const enc = new TextEncoder();
  const buf = enc.encode("hello\nworld");
  const e = chunkEnd(buf, 0, 4);
  assert.ok(e > 0);
});

test("native and TS chunking agree on ascii", () => {
  const enc = new TextEncoder();
  const s = "a".repeat(500) + "\n" + "b".repeat(500);
  const buf = enc.encode(s);
  const a = chunkUtf8Bytes(buf, 120);
  const b = chunkUtf8(buf, 120);
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.deepEqual(Buffer.from(a[i]!), Buffer.from(b[i]!));
  }
});
