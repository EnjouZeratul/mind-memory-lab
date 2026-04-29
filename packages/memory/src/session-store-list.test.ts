import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { SessionStore } from "./session-store.js";

test("listSessions 按时间倒序", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mind-sess-"));
  const store = new SessionStore(dir);
  await store.ensureSession("a");
  await store.append("a", { role: "user", content: "hello", ts: 1 });
  await store.ensureSession("b");
  await store.append("b", { role: "user", content: "world", ts: 2 });
  const list = await store.listSessions(10);
  assert.ok(list.length >= 2);
  assert.ok(list[0]!.updatedAt >= list[1]!.updatedAt);
});
