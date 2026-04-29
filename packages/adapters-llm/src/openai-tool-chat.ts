import type { ToolCall, ToolDefinition } from "@mind/agent-contract";
import type { OpenAICompatConfig } from "./openai-compatible.js";

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
      /** DashScope / DeepSeek R1 等多轮上下文字段。 */
      reasoning_content?: string;
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolChatResult {
  content: string | null;
  tool_calls?: ToolCall[];
}

export type OpenAiToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } };

/**
 * 部分 OpenAI 兼容网关（如阿里云 DashScope）仅接受 `tool_choice` 为 `"none"` | `"auto"`，
 * 传入 `required` 或 `{ type: "function", ... }` 会 400。默认降级为 `"auto"`；
 * 官方 OpenAI 等需保留强制工具时设环境变量 `MIND_OPENAI_TOOL_CHOICE_STRICT=1`。
 */
export function normalizeOpenAiToolChoiceForUpstream(
  choice: OpenAiToolChoice | undefined,
  env: { MIND_OPENAI_TOOL_CHOICE_STRICT?: string | undefined } = process.env,
): OpenAiToolChoice | undefined {
  if (choice === undefined || choice === "none" || choice === "auto") return choice;
  const strict = /^(1|true|yes)$/i.test(String(env.MIND_OPENAI_TOOL_CHOICE_STRICT ?? "").trim());
  if (strict) return choice;
  return "auto";
}

export async function openAiToolChatCompletion(
  cfg: OpenAICompatConfig,
  body: {
    messages: ChatMessage[];
    tools: ToolDefinition[];
    max_tokens?: number;
    temperature?: number;
    /** 毫秒；缺省 120000。使用 `AbortSignal.timeout`（Node 18+）。 */
    requestTimeoutMs?: number;
    /** 覆盖默认 `auto`（例如首轮强制 `web_search`）。 */
    tool_choice?: OpenAiToolChoice;
  },
): Promise<ToolChatResult> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const timeoutMs = body.requestTimeoutMs ?? 120_000;
  const signal = AbortSignal.timeout(Math.min(300_000, Math.max(5_000, timeoutMs)));
  const rawChoice =
    body.tool_choice !== undefined ? body.tool_choice : body.tools.length ? "auto" : undefined;
  const toolChoice = normalizeOpenAiToolChoiceForUpstream(rawChoice);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: cfg.model,
      messages: body.messages,
      tools: body.tools,
      tool_choice: toolChoice,
      max_tokens: body.max_tokens ?? 2048,
      temperature: body.temperature ?? 0.3,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI-compatible tools error ${res.status}: ${txt}`);
  }
  const json = (await res.json()) as {
    choices?: {
      message?: {
        content?: string | null;
        tool_calls?: ToolCall[];
      };
    }[];
  };
  const msg = json.choices?.[0]?.message;
  return {
    content: msg?.content ?? null,
    tool_calls: msg?.tool_calls,
  };
}
