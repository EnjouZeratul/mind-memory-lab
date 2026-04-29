import { ConfigurationError } from "@mind/kernel";
import type { LLMProvider } from "@mind/kernel";
import { AnthropicProvider } from "./anthropic.js";
import type { OpenAICompatConfig } from "./openai-compatible.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";

/** OpenAI 兼容 chat/completions（含 tools）所需的配置；Anthropic 不在此列。 */
export function createOpenAiCompatConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): OpenAICompatConfig {
  const kind = (env.MIND_LLM_PROVIDER ?? "openai").toLowerCase();
  if (kind === "dashscope" || kind === "bailian") {
    const key = env.DASHSCOPE_API_KEY?.trim();
    if (!key) throw new ConfigurationError("缺少 DASHSCOPE_API_KEY（百炼 DashScope API-Key）");
    const raw =
      env.DASHSCOPE_BASE_URL?.trim() || "https://dashscope.aliyuncs.com/compatible-mode";
    const baseUrl = `${raw.replace(/\/$/, "")}/v1`;
    const model = env.DASHSCOPE_MODEL?.trim() || "deepseek-r1";
    return { baseUrl, apiKey: key, model, backendLabel: "dashscope" };
  }
  if (kind === "anthropic") {
    throw new ConfigurationError("当前 agent 工具回合仅支持 OpenAI 兼容端点；请将 MIND_LLM_PROVIDER 设为 openai、ollama 或 dashscope。");
  }
  if (kind === "openai" || kind === "ollama") {
    const key = env.OPENAI_API_KEY ?? "ollama";
    const base =
      kind === "ollama"
        ? (env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434") + "/v1"
        : (env.OPENAI_BASE_URL ?? "https://api.openai.com/v1");
    const model =
      kind === "ollama"
        ? (env.OLLAMA_MODEL ?? "llama3.2")
        : (env.OPENAI_MODEL ?? "gpt-4o-mini");
    return {
      baseUrl: base,
      apiKey: key,
      model,
      backendLabel: kind === "ollama" ? "ollama" : "openai",
    };
  }
  throw new ConfigurationError(`未知的 MIND_LLM_PROVIDER: ${kind}`);
}

export function createLlmFromEnv(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const kind = (env.MIND_LLM_PROVIDER ?? "openai").toLowerCase();
  if (kind === "dashscope" || kind === "bailian" || kind === "openai" || kind === "ollama") {
    const c = createOpenAiCompatConfigFromEnv(env);
    return new OpenAICompatibleProvider(c);
  }
  if (kind === "anthropic") {
    const key = env.ANTHROPIC_API_KEY;
    if (!key) throw new ConfigurationError("缺少 ANTHROPIC_API_KEY");
    const model = env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";
    return new AnthropicProvider({ apiKey: key, model });
  }
  throw new ConfigurationError(`未知的 MIND_LLM_PROVIDER: ${kind}`);
}
