import type { RequestId, TraceId } from "./trace.js";

export type UnitType =
  | "perception"
  | "reflection"
  | "reasoning"
  | "metacognition";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  /** 深度思考文本；与上游 `reasoning_content` / 会话存储对齐。 */
  reasoning?: string;
}

/** 与文档草案对齐的最小输入子集 */
export interface ThinkingInput {
  content: string;
  context: {
    conversationHistory: ChatMessage[];
    relatedUnits: string[];
    globalContext: Record<string, unknown>;
    timestamp: number;
  };
  params: {
    maxTokens?: number;
    temperature?: number;
    requireExplanation?: boolean;
    requireConfidence?: boolean;
    timeoutMs?: number;
  };
  metadata: {
    fromUnit?: string;
    fromSystem?: string;
    requestId: RequestId;
    traceId: TraceId;
  };
}

export interface ThinkingOutput {
  content: string;
  metadata: {
    unitId: string;
    backendType: string;
    processingTimeMs: number;
    requestId: RequestId;
    traceId: TraceId;
    timestamp: number;
  };
  flags: {
    requiresFollowup: boolean;
    uncertain: boolean;
    needsHumanIntervention: boolean;
    lowConfidence: boolean;
  };
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}
