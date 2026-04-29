import assert from "node:assert/strict";
import test from "node:test";
import { fnv1a64Hex } from "./fnv.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

test("fnv1a64Hex matches C when native available", () => {
  const enc = new TextEncoder();
  const buf = enc.encode("mind-memory-lab");
  const ts = fnv1a64Hex(buf);
  let native: string | null = null;
  try {
    const m = require("@mind/native-mindmem");
    if (m?.fnv1a64Hex) native = m.fnv1a64Hex(Buffer.from(buf));
  } catch {
    /* 未编译原生模块 */
  }
  if (native) assert.equal(ts, native);
  else assert.match(ts, /^[0-9a-f]{16}$/);
});
