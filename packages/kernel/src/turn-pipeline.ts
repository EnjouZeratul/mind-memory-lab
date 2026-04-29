import { createRequestId, createTraceId } from "./types/trace.js";
import type { ThinkingInput } from "./types/thinking.js";
import type { LLMProvider } from "./llm-provider.js";
import type {
  ComputeRoutingPort,
  ComputeSurface,
  NeuromorphicHintPort,
} from "./extension-ports.js";
import type { RecallPort, SessionPort, WorkspaceSnippetPort } from "./ports.js";
import { clampPasses, decideTurnDepth, type TurnDepthDecision } from "./turn-depth-policy.js";

export interface TurnPipelineOptions {
  llm: LLMProvider;
  session: SessionPort;
  recall: RecallPort;
  workspace?: WorkspaceSnippetPort;
  ftsLimit: number;
  recallTokenBudget: number;
  workspaceSnippetLimit: number;
  /** 允许的最大生成轮数；环境可置 1 关闭第二轮。默认 2。 */
  maxPasses?: 1 | 2;
  /** 覆盖默认的 `decideTurnDepth`。 */
  decideDepth?: (userText: string) => TurnDepthDecision;
  computeRouting?: ComputeRoutingPort;
  neuromorphicHints?: NeuromorphicHintPort;
}

export interface TurnInput {
  sessionId: string;
  userText: string;
}

export interface TurnResult {
  assistantText: string;
  citations: { path: string; chunkId: string; excerpt: string }[];
  requestId: string;
  traceId: string;
  passesUsed: 1 | 2;
  depthReasons: string[];
  computeSurface?: ComputeSurface;
}

export class TurnPipeline {
  constructor(private readonly opts: TurnPipelineOptions) {}

  async run(turn: TurnInput): Promise<TurnResult> {
    const requestId = createRequestId();
    const traceId = createTraceId();
    const maxPasses = this.opts.maxPasses ?? 2;
    const decide = this.opts.decideDepth ?? decideTurnDepth;

    const computeSurface = this.opts.computeRouting
      ? await this.opts.computeRouting.resolveSurface({
          sessionId: turn.sessionId,
          userText: turn.userText,
        })
      : undefined;

    if (this.opts.neuromorphicHints) {
      await this.opts.neuromorphicHints.spikeBudgetFor(turn.userText);
    }

    const history = await this.opts.session.loadSession(turn.sessionId);
    const citations = await this.opts.recall.recallForPrompt(
      turn.userText,
      this.opts.ftsLimit,
      this.opts.recallTokenBudget,
    );
    const ws = this.opts.workspace
      ? await this.opts.workspace.searchSnippets(
          turn.userText,
          this.opts.workspaceSnippetLimit,
        )
      : [];

    const memoryBlock = citations
      .map((c) => `(${c.chunkId}) ${c.excerpt}`)
      .join("\n\n");
    const wsBlock = ws.map((w) => `(${w.path}) ${w.text}`).join("\n\n");

    const systemPreamble = [
      "你是受记忆约束的学术写作型助手：回答须理性、克制，并显式区分证据与推断。",
      "下列片段来自可检索记忆库或工作区文本，可能不完整；请勿将其当作无歧义事实，除非与当前问题直接一致。",
      memoryBlock ? `【记忆片段】\n${memoryBlock}` : "",
      wsBlock ? `【工作区片段】\n${wsBlock}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const baseInput = (content: string, fromSystem: string): ThinkingInput => ({
      content,
      context: {
        conversationHistory: history,
        relatedUnits: [],
        globalContext: { systemPreamble },
        timestamp: Date.now(),
      },
      params: {
        maxTokens: 2048,
        temperature: 0.4,
      },
      metadata: {
        fromSystem,
        requestId,
        traceId,
      },
    });

    const first = await this.opts.llm.complete(
      baseInput(turn.userText, "turn-pipeline"),
    );

    const depth = decide(turn.userText);
    const wantSecond =
      clampPasses(depth.passes, maxPasses, first.flags.uncertain || first.flags.lowConfidence) === 2;

    let assistantText = first.content;
    let passesUsed: 1 | 2 = 1;
    const depthReasons = [...depth.reasons];

    if (wantSecond) {
      if (first.flags.uncertain || first.flags.lowConfidence) {
        depthReasons.push("low_confidence_or_uncertain");
      }
      const refinementContent = [
        "【首轮草稿】",
        first.content,
        "",
        "【用户问题】",
        turn.userText,
        "",
        "若草稿已充分且无明显事实或逻辑错误，请一字不改地输出草稿全文。",
        "否则输出修订后的完整答复。",
      ].join("\n");

      const second = await this.opts.llm.complete({
        ...baseInput(refinementContent, "turn-pipeline-refine"),
        params: {
          maxTokens: 2048,
          temperature: 0.2,
        },
      });
      assistantText = second.content;
      passesUsed = 2;
    }

    await this.opts.session.appendMessage(turn.sessionId, {
      role: "user",
      content: turn.userText,
    });
    await this.opts.session.appendMessage(turn.sessionId, {
      role: "assistant",
      content: assistantText,
    });

    return {
      assistantText,
      citations,
      requestId,
      traceId,
      passesUsed,
      depthReasons,
      computeSurface,
    };
  }
}
