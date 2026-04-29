/** OpenAI-compatible function tool schema（子集）。 */

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    /** JSON 对象字符串 */
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export type AgentTurnPhase = "idle" | "awaiting_tools" | "complete";

export interface AgentTurnState {
  phase: AgentTurnPhase;
  round: number;
  maxRounds: number;
  pendingCalls: ToolCall[];
}

export function emptyTurnState(maxRounds: number): AgentTurnState {
  return { phase: "idle", round: 0, maxRounds, pendingCalls: [] };
}
