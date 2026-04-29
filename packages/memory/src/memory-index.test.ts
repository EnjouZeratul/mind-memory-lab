import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MemoryIndex } from "./memory-index.js";

test("MemoryIndex 增量与检索", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mind-mem-"));
  const idx = new MemoryIndex({ dataDirAbs: dir, maxChunkBytes: 256 });
  idx.open();
  const mem = path.join(dir, "memory", "a");
  await fs.mkdir(mem, { recursive: true });
  await fs.writeFile(path.join(mem, "hello.md"), "# hi\nworld quantum\n", "utf8");
  await idx.syncFromDisk();
  const hits = idx.search("quantum", 5);
  assert.ok(hits.length >= 1);
  idx.close();
});
