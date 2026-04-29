import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { joinFrontmatter } from "./frontmatter-parse.js";
import { archiveMemoryDoc } from "./memory-archive.js";
import { readMemoryDoc } from "./memory-read.js";

test("archiveMemoryDoc 仅更新 frontmatter", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mind-arch-"));
  const mem = path.join(root, "memory");
  await fs.mkdir(path.join(mem, "x"), { recursive: true });
  const rel = "x/a.md";
  await fs.writeFile(
    path.join(mem, rel),
    joinFrontmatter(
      { title: "A", created: new Date().toISOString(), layer: "longterm", status: "stable" },
      "hello",
    ),
    "utf8",
  );
  await archiveMemoryDoc(mem, rel, { move: false });
  const doc = await readMemoryDoc(mem, rel);
  assert.equal(doc.meta.status, "archived");
  assert.ok(doc.meta.archived_at);
});
