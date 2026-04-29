import assert from "node:assert/strict";
import test from "node:test";
import { DefaultToolPolicy } from "./default-tool-policy.js";

test("DefaultToolPolicy 拒绝 .env 文件名", () => {
  const p = new DefaultToolPolicy();
  assert.equal(p.allowReadPath("foo/.env"), false);
  assert.equal(p.allowReadPath("src/main.ts"), true);
});

test("DefaultToolPolicy 拒绝 node_modules 段", () => {
  const p = new DefaultToolPolicy();
  assert.equal(p.allowReadPath("node_modules/foo/index.js"), false);
});
