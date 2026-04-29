import assert from "node:assert/strict";
import test from "node:test";
import { chatDeliveryModeFromEnv, EnvChatRouter } from "./chat-router-port.js";

test("chatDeliveryModeFromEnv 默认 unified_agent", () => {
  assert.equal(chatDeliveryModeFromEnv({}), "unified_agent");
  assert.equal(chatDeliveryModeFromEnv({ MIND_CHAT_DELIVERY: "memory" }), "memory_pipeline");
});

test("EnvChatRouter 与 env 一致", async () => {
  const r = new EnvChatRouter({ MIND_CHAT_DELIVERY: "memory_pipeline" });
  assert.equal(await r.resolveDelivery({ userText: "x" }), "memory_pipeline");
});
