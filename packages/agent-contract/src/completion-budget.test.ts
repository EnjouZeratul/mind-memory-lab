import assert from "node:assert/strict";
import test from "node:test";
import { agentCompletionBudgetFromEnv } from "./completion-budget.js";

test("agentCompletionBudgetFromEnv 缺省值", () => {
  const b = agentCompletionBudgetFromEnv({});
  assert.equal(b.maxTokensPrimary, 2048);
  assert.equal(b.maxTokensFinal, 1024);
  assert.equal(b.requestTimeoutMs, 120_000);
});

test("agentCompletionBudgetFromEnv 可解析环境", () => {
  const b = agentCompletionBudgetFromEnv({
    MIND_AGENT_MAX_TOKENS: "512",
    MIND_AGENT_MAX_TOKENS_FINAL: "400",
    MIND_AGENT_OPENAI_TIMEOUT_MS: "30000",
  });
  assert.equal(b.maxTokensPrimary, 512);
  assert.equal(b.maxTokensFinal, 400);
  assert.equal(b.requestTimeoutMs, 30_000);
});
