import type { OpenAICompatConfig } from "@mind/adapters-llm";
import {
  openAiChatCompletionStream,
  openAiToolChatCompletion,
  type ChatMessage,
  type OpenAiToolChoice,
} from "@mind/adapters-llm";
import type {
  AgentCompletionBudget,
  AgentToolCallTrace,
  AgentTurnOutput,
  DelegationPort,
  HookRegistryPort,
  McpHostPort,
  SkillRegistryPort,
  ToolPolicyPort,
  ToolResult,
  WebSearchPort,
} from "@mind/agent-contract";
import { builtinToolDefinitions, ReadonlyToolExecutor } from "@mind/tools-core";
import type { WorkspaceReader } from "@mind/workspace";

const BUILTIN_TOOL_NAMES = new Set(builtinToolDefinitions().map((t) => t.function.name));

function preview(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export interface AgentToolLoopOptions {
  openAi: OpenAICompatConfig;
  reader: WorkspaceReader;
  policy: ToolPolicyPort;
  /** 联网检索；缺省则不注入，内置 web_search 将返回未配置错误。 */
  webSearch?: WebSearchPort;
  /** 追加到 system 的短文本（如服务端预检索摘要）。 */
  systemAppend?: string;
  /** 仅首轮补全传入；用于在必答时效题时强制调用某工具（如 web_search）。 */
  forceFirstToolChoice?: OpenAiToolChoice;
  /** 最终自然语言输出按块回调（无 tools 的流式补全）；缺省则整段返回。 */
  onFinalDelta?: (chunk: string) => void;
  /** 与 `delta.reasoning_content` 对齐的思考流片段（如 DeepSeek R1）。 */
  onReasoningDelta?: (chunk: string) => void;
  /** 模型发起 tool 轮次上限（不含首轮用户消息）。 */
  maxToolRounds: number;
  /** 每轮补全的 token 上限与单次 HTTP 超时（显式预算端口）。 */
  budget: AgentCompletionBudget;
  mcp: McpHostPort;
  hooks: HookRegistryPort;
  skills: SkillRegistryPort;
  delegation: DelegationPort;
}

export type { AgentTurnOutput, AgentToolCallTrace } from "@mind/agent-contract";

export class AgentToolLoop {
  private readonly exec: ReadonlyToolExecutor;

  constructor(private readonly opts: AgentToolLoopOptions) {
    this.exec = new ReadonlyToolExecutor(opts.reader, opts.policy, opts.webSearch);
  }

  async run(
    userText: string,
    history: { role: "user" | "assistant" | "system"; content: string; reasoning?: string }[],
  ): Promise<AgentTurnOutput> {
    const sub = await this.opts.delegation.delegateStructured("user_turn", userText);
    const userEffective = sub ?? userText;

    const skillAdd = await this.opts.skills.resolveSkillPrompt([]);
    const systemPreamble = [
      "你是受工作区只读工具与联网检索约束的助手；工作区内事实用 read_file、list_dir、grep_workspace；对可能超出训练知识截止或不在仓库内的公开事实，须结合 web_search 与系统给出的联网摘要（若有）作答，避免凭记忆臆断。",
      skillAdd ? skillAdd : "",
      this.opts.systemAppend ?? "",
    ]
      .filter(Boolean)
      .join("\n");

    const messages: ChatMessage[] = [{ role: "system", content: systemPreamble }];
    for (const m of history) {
      if (m.role === "system") messages.push({ role: "system", content: m.content });
      else if (m.role === "user") messages.push({ role: "user", content: m.content });
      else if (m.reasoning)
        messages.push({
          role: "assistant",
          content: m.content,
          reasoning_content: m.reasoning,
        });
      else messages.push({ role: "assistant", content: m.content });
    }
    messages.push({ role: "user", content: userEffective });

    const remote = await this.opts.mcp.listRemoteTools();
    const tools = [...builtinToolDefinitions(), ...remote];

    const toolTrace: AgentToolCallTrace[] = [];
    let toolRounds = 0;
    while (toolRounds < this.opts.maxToolRounds) {
      const toolChoice: OpenAiToolChoice | undefined =
        toolRounds === 0 && this.opts.forceFirstToolChoice ? this.opts.forceFirstToolChoice : undefined;
      const { content, tool_calls } = await openAiToolChatCompletion(this.opts.openAi, {
        messages,
        tools,
        max_tokens: this.opts.budget.maxTokensPrimary,
        temperature: 0.3,
        requestTimeoutMs: this.opts.budget.requestTimeoutMs,
        tool_choice: toolChoice,
      });

      if (!tool_calls?.length) {
        const raw = content ?? "";
        if (this.opts.onFinalDelta) {
          if (raw.length > 0) {
            for (let i = 0; i < raw.length; i += 28) {
              this.opts.onFinalDelta(raw.slice(i, i + 28));
            }
            return {
              assistant: raw,
              toolRounds,
              toolTrace: toolTrace.length ? toolTrace : undefined,
            };
          }
          let reasoningAcc = "";
          const onThink = (c: string) => {
            reasoningAcc += c;
            this.opts.onReasoningDelta?.(c);
          };
          const streamed = await openAiChatCompletionStream(
            this.opts.openAi,
            {
              messages,
              max_tokens: this.opts.budget.maxTokensPrimary,
              temperature: 0.35,
              requestTimeoutMs: this.opts.budget.requestTimeoutMs,
            },
            this.opts.onFinalDelta,
            onThink,
          );
          return {
            assistant: streamed,
            reasoning: reasoningAcc.length > 0 ? reasoningAcc : undefined,
            toolRounds,
            toolTrace: toolTrace.length ? toolTrace : undefined,
          };
        }
        return { assistant: raw, toolRounds, toolTrace: toolTrace.length ? toolTrace : undefined };
      }

      messages.push({
        role: "assistant",
        content: content ?? null,
        tool_calls,
      });

      const traceRound = toolRounds;
      for (const call of tool_calls) {
        await this.opts.hooks.beforeTool(call);
        let body: string;
        if (BUILTIN_TOOL_NAMES.has(call.function.name)) {
          body = await this.exec.execute(call.function.name, call.function.arguments);
        } else {
          body = await this.opts.mcp.invokeRemote(call.function.name, call.function.arguments);
        }
        toolTrace.push({
          round: traceRound,
          name: call.function.name,
          argumentsPreview: preview(call.function.arguments, 520),
          resultPreview: preview(body, 720),
        });
        const result: ToolResult = { toolCallId: call.id, content: body };
        await this.opts.hooks.afterTool(call, result);
        messages.push({ role: "tool", tool_call_id: call.id, content: body });
      }
      toolRounds += 1;
    }

    const last = await openAiToolChatCompletion(this.opts.openAi, {
      messages,
      tools,
      max_tokens: this.opts.budget.maxTokensFinal,
      temperature: 0.2,
      requestTimeoutMs: this.opts.budget.requestTimeoutMs,
    });
    const rawLast = last.content ?? "";
    if (this.opts.onFinalDelta) {
      if (rawLast.length > 0) {
        for (let i = 0; i < rawLast.length; i += 28) {
          this.opts.onFinalDelta(rawLast.slice(i, i + 28));
        }
        return {
          assistant: rawLast,
          toolRounds,
          toolTrace: toolTrace.length ? toolTrace : undefined,
        };
      }
      let reasoningAcc = "";
      const onThink = (c: string) => {
        reasoningAcc += c;
        this.opts.onReasoningDelta?.(c);
      };
      const streamed = await openAiChatCompletionStream(
        this.opts.openAi,
        {
          messages,
          max_tokens: this.opts.budget.maxTokensFinal,
          temperature: 0.25,
          requestTimeoutMs: this.opts.budget.requestTimeoutMs,
        },
        this.opts.onFinalDelta,
        onThink,
      );
      return {
        assistant: streamed,
        reasoning: reasoningAcc.length > 0 ? reasoningAcc : undefined,
        toolRounds,
        toolTrace: toolTrace.length ? toolTrace : undefined,
      };
    }
    return {
      assistant: rawLast,
      toolRounds,
      toolTrace: toolTrace.length ? toolTrace : undefined,
    };
  }
}
