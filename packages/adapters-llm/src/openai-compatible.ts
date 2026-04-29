import type { LLMProvider, ThinkingInput, ThinkingOutput } from "@mind/kernel";

export interface OpenAICompatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  backendLabel: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly backendType: string;

  constructor(private readonly cfg: OpenAICompatConfig) {
    this.backendType = cfg.backendLabel;
  }

  async complete(input: ThinkingInput): Promise<ThinkingOutput> {
    const t0 = Date.now();
    const system = String(input.context.globalContext.systemPreamble ?? "");
    const messages: { role: string; content: string }[] = [];
    if (system) messages.push({ role: "system", content: system });
    for (const m of input.context.conversationHistory) {
      messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: "user", content: input.content });

    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        messages,
        max_tokens: input.params.maxTokens ?? 1024,
        temperature: input.params.temperature ?? 0.3,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI-compatible error ${res.status}: ${txt}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    return {
      content: text,
      metadata: {
        unitId: "openai-compatible",
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
