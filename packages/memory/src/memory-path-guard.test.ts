import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMemoryRelPath } from "./memory-path-guard.js";

test("normalizeMemoryRelPath 接受合法相对路径", () => {
  assert.equal(normalizeMemoryRelPath("a/b.md"), "a/b.md");
});

test("normalizeMemoryRelPath 拒绝越界", () => {
  assert.throws(() => normalizeMemoryRelPath("../x.md"));
  assert.throws(() => normalizeMemoryRelPath("a/../b.md"));
});

test("normalizeMemoryRelPath 仅允许 md", () => {
  assert.throws(() => normalizeMemoryRelPath("a/b.txt"));
});
