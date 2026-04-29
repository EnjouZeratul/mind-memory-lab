import type { LLMProvider, ThinkingInput, ThinkingOutput } from "@mind/kernel";

export interface AnthropicConfig {
  apiKey: string;
  model: string;
}

export class AnthropicProvider implements LLMProvider {
  readonly backendType = "anthropic";

  constructor(private readonly cfg: AnthropicConfig) {}

  async complete(input: ThinkingInput): Promise<ThinkingOutput> {
    const t0 = Date.now();
    const system = String(input.context.globalContext.systemPreamble ?? "");
    const messages: { role: string; content: string }[] = [];
    for (const m of input.context.conversationHistory) {
      if (m.role === "system") continue;
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: input.content });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.cfg.model,
        max_tokens: input.params.maxTokens ?? 1024,
        temperature: input.params.temperature ?? 0.3,
        system: system || undefined,
        messages,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Anthropic error ${res.status}: ${txt}`);
    }
    const json = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const block = json.content?.find((c) => c.type === "text");
    const text = block?.text ?? "";
    return {
      content: text,
      metadata: {
        unitId: "anthropic",
        backendType: this.backendType,
        processingTimeMs: Date.now() - t0,
        requestId: input.metadata.requestId,
        traceId: input.metadata.traceId,
        timestamp: Date.now(),
      },
      flags: {
        requiresFollowup: false,
        uncertain: false,
        needsHumanIntervention: false,
        lowConfidence: false,
      },
    };
  }
}
