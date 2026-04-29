import assert from "node:assert/strict";
import test from "node:test";
import { emptyTurnState } from "./tool-types.js";

test("emptyTurnState", () => {
  const s = emptyTurnState(8);
  assert.equal(s.phase, "idle");
  assert.equal(s.round, 0);
  assert.equal(s.maxRounds, 8);
  assert.equal(s.pendingCalls.length, 0);
});
