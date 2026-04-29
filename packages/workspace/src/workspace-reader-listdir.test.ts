import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkspaceReader } from "./workspace-reader.js";

test("listDirectoryEntries 根目录列出子项", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mind-ws-"));
  await fs.writeFile(path.join(root, "a.txt"), "x", "utf8");
  await fs.mkdir(path.join(root, "sub"), { recursive: true });
  const r = new WorkspaceReader({ rootAbs: root, maxFileBytes: 1000 });
  await r.init();
  const names = await r.listDirectoryEntries("");
  assert.ok(names);
  assert.ok(names!.includes("a.txt"));
  assert.ok(names!.includes("sub"));
});
