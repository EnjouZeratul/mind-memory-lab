import assert from "node:assert/strict";
import test from "node:test";
import { clampPasses, decideTurnDepth } from "./turn-depth-policy.js";

test("decideTurnDepth 短句单轮", () => {
  const d = decideTurnDepth("你好。");
  assert.equal(d.passes, 1);
});

test("decideTurnDepth 长文本双轮", () => {
  const d = decideTurnDepth("x".repeat(950));
  assert.equal(d.passes, 2);
  assert.ok(d.reasons.includes("length"));
});

test("decideTurnDepth 多问号双轮", () => {
  const d = decideTurnDepth("a? b? c?");
  assert.equal(d.passes, 2);
});

test("decideTurnDepth 代码围栏双轮", () => {
  const d = decideTurnDepth("见下\n```\ncode\n```");
  assert.equal(d.passes, 2);
});

test("clampPasses 尊重 maxPasses", () => {
  assert.equal(clampPasses(2, 1, false), 1);
  assert.equal(clampPasses(1, 2, true), 2);
});
