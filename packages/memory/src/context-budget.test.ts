import assert from "node:assert/strict";
import test from "node:test";
import { packHitsUnderBudget } from "./context-budget.js";
import type { SearchHit } from "./memory-index.js";

test("packHitsUnderBudget 单调裁剪", () => {
  const hits: SearchHit[] = Array.from({ length: 20 }).map((_, i) => ({
    path: "p",
    chunkId: `p#${i}`,
    body: "word ".repeat(80),
    score: i,
  }));
  const small = packHitsUnderBudget(hits, 50);
  const big = packHitsUnderBudget(hits, 5000);
  assert.ok(small.length <= big.length);
});
