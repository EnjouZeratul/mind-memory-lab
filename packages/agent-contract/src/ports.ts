import type { ToolCall, ToolDefinition, ToolResult } from "./tool-types.js";

/** 单次路径/工具调用策略（叠在热路径上，无第二调用栈）。 */
export interface ToolPolicyPort {
  /** 返回 false 则工具执行器应拒绝并返回 isError 结果。 */
  allowReadPath(relPosix: string): boolean;
}

export interface McpHostPort {
  listRemoteTools(): Promise<ToolDefinition[]>;
  invokeRemote(name: string, argsJson: string): Promise<string>;
}

export interface HookRegistryPort {
  beforeTool(call: ToolCall): Promise<void>;
  afterTool(call: ToolCall, result: ToolResult): Promise<void>;
}

export interface SkillRegistryPort {
  /** 返回附加到 system 的短文本，无则空串。 */
  resolveSkillPrompt(skillIds: string[]): Promise<string>;
}

export interface DelegationPort {
  /** 首版占位：可返回 null 表示不支持子代理。 */
  delegateStructured(goal: string, context: string): Promise<string | null>;
}
