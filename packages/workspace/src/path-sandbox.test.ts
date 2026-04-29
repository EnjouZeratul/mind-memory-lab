import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { resolveUnderRoot } from "./path-sandbox.js";

test("resolveUnderRoot accepts nested", () => {
  const root = path.resolve("/proj");
  const inner = path.join(root, "a", "b.txt");
  assert.equal(resolveUnderRoot(root, inner), "a/b.txt");
});

test("resolveUnderRoot rejects escape", () => {
  const root = path.resolve("/proj");
  const bad = path.resolve("/proj/../etc/passwd");
  assert.equal(resolveUnderRoot(root, bad), null);
});
