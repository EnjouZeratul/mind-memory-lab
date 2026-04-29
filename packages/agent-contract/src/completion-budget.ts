/**
 * 单次数据结构承载 tool 回合的 token 与 HTTP 超时上限（对齐「显式预算端口」，无装饰器链）。
 */

export interface AgentCompletionBudget {
  maxTokensPrimary: number;
  maxTokensFinal: number;
  requestTimeoutMs: number;
}

export function agentCompletionBudgetFromEnv(env: NodeJS.ProcessEnv = process.env): AgentCompletionBudget {
  const requestTimeoutMs = Math.min(
    300_000,
    Math.max(5_000, parseInt(String(env.MIND_AGENT_OPENAI_TIMEOUT_MS ?? "120000"), 10) || 120_000),
  );
  const maxTokensPrimary = Math.min(
    8192,
    Math.max(256, parseInt(String(env.MIND_AGENT_MAX_TOKENS ?? "2048"), 10) || 2048),
  );
  const maxTokensFinal = Math.min(
    8192,
    Math.max(256, parseInt(String(env.MIND_AGENT_MAX_TOKENS_FINAL ?? "1024"), 10) || 1024),
  );
  return { maxTokensPrimary, maxTokensFinal, requestTimeoutMs };
}
