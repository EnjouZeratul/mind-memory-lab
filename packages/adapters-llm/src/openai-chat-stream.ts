import type { OpenAICompatConfig } from "./openai-compatible.js";
import type { ChatMessage } from "./openai-tool-chat.js";

/**
 * 无 tools 的流式补全（用于最终自然语言输出）；按 OpenAI SSE `data:` 行解析。
 */
export async function openAiChatCompletionStream(
  cfg: OpenAICompatConfig,
  body: {
    messages: ChatMessage[];
    max_tokens?: number;
    temperature?: number;
    requestTimeoutMs?: number;
  },
  onDelta: (chunk: string) => void,
  onReasoningDelta?: (chunk: string) => void,
): Promise<string> {
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const timeoutMs = body.requestTimeoutMs ?? 120_000;
  const signal = AbortSignal.timeout(Math.min(300_000, Math.max(5_000, timeoutMs)));
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
      max_tokens: body.max_tokens ?? 2048,
      temperature: body.temperature ?? 0.3,
      stream: true,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI-compatible stream error ${res.status}: ${txt}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("stream_no_body");
  const dec = new TextDecoder();
  let carry = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = carry.indexOf("\n")) >= 0) {
      const line = carry.slice(0, idx).trimEnd();
      carry = carry.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload) as {
          choices?: {
            delta?: {
              content?: string | null;
              reasoning_content?: string | null;
              /** 个别网关别名 */
              reasoning?: string | null;
            };
          }[];
        };
        const delta = j.choices?.[0]?.delta;
        const thinkRaw = delta?.reasoning_content ?? delta?.reasoning;
        if (typeof thinkRaw === "string" && thinkRaw.length > 0 && onReasoningDelta) {
          onReasoningDelta(thinkRaw);
        }
        const piece = delta?.content;
        if (typeof piece === "string" && piece.length > 0) {
          full += piece;
          onDelta(piece);
        }
      } catch {
        /* 忽略非 JSON 行 */
      }
    }
  }
  return full;
}
