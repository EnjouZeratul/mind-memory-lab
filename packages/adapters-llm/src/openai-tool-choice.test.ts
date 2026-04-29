import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOpenAiToolChoiceForUpstream } from "./openai-tool-chat.js";

test("normalize 保留 auto/none/undefined", () => {
  assert.equal(normalizeOpenAiToolChoiceForUpstream(undefined, {}), undefined);
  assert.equal(normalizeOpenAiToolChoiceForUpstream("auto", {}), "auto");
  assert.equal(normalizeOpenAiToolChoiceForUpstream("none", {}), "none");
});

test("默认将 required 与 function 强制降为 auto（兼容 DashScope 等）", () => {
  assert.equal(normalizeOpenAiToolChoiceForUpstream("required", {}), "auto");
  assert.equal(
    normalizeOpenAiToolChoiceForUpstream({ type: "function", function: { name: "web_search" } }, {}),
    "auto",
  );
});

test("MIND_OPENAI_TOOL_CHOICE_STRICT=1 时原样透传", () => {
  const env = { MIND_OPENAI_TOOL_CHOICE_STRICT: "1" };
  assert.equal(normalizeOpenAiToolChoiceForUpstream("required", env), "required");
  const forced = { type: "function" as const, function: { name: "web_search" } };
  assert.deepEqual(normalizeOpenAiToolChoiceForUpstream(forced, env), forced);
});
