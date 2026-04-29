import type { Response } from "express";
import type { AgentToolCallTrace } from "@mind/agent-contract";
import { agentCompletionBudgetFromEnv } from "@mind/agent-contract";
import {
  AgentToolLoop,
  EnvSkillRegistry,
  NoopDelegation,
  NoopHookRegistry,
  NoopMcpHost,
  NoopSkillRegistry,
} from "@mind/agent-host";
import { createOpenAiCompatConfigFromEnv } from "@mind/adapters-llm";
import { createWebSearchFromEnv } from "@mind/adapters-web-search";
import type { ComputeRoutingPort, RecallPort, SessionPort, WorkspaceSnippetPort } from "@mind/kernel";
import { createRequestId } from "@mind/kernel";
import { appendMemoryEvent } from "@mind/memory";
import { DefaultToolPolicy } from "@mind/tools-core";
import type { WorkspaceReader } from "@mind/workspace";
import { mergeAgentToolTrace, runServerWebPrefetch } from "./agent-web-prefetch.js";

export type Citation = { path: string; chunkId: string; excerpt: string };

export interface UnifiedChatDeps {
  session: SessionPort;
  recall: RecallPort;
  workspace: WorkspaceSnippetPort | undefined;
  reader: WorkspaceReader;
  ftsLimit: number;
  recallTokenBudget: number;
  workspaceSnippetLimit: number;
  dataDirAbs: string;
  computeRouting?: ComputeRoutingPort;
}

function buildEvidenceAppendix(citations: Citation[], ws: { path: string; text: string }[]): string {
  const memoryBlock = citations.map((c) => `(${c.chunkId}) ${c.excerpt}`).join("\n\n");
  const wsBlock = ws.map((w) => `(${w.path}) ${w.text}`).join("\n\n");
  const parts = [
    "下列片段来自可检索记忆库或工作区文本，可能不完整；请勿将其当作无歧义事实，除非与当前问题直接一致。",
    memoryBlock ? `【记忆片段】\n${memoryBlock}` : "",
    wsBlock ? `【工作区片段】\n${wsBlock}` : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

async function logAgent(dataDirAbs: string, payload: Record<string, unknown>): Promise<void> {
  if (process.env.MIND_AGENT_EVENTS !== "1") return;
  await appendMemoryEvent(dataDirAbs, { kind: "agent", ...payload });
}

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function prepareLoop(
  deps: UnifiedChatDeps,
  input: { sessionId: string; userText: string },
  onFinalDelta: ((chunk: string) => void) | undefined,
  onReasoningDelta?: (chunk: string) => void,
): Promise<{
  loop: AgentToolLoop;
  pre: Awaited<ReturnType<typeof runServerWebPrefetch>>;
  citations: Citation[];
  history: { role: "user" | "assistant" | "system"; content: string; reasoning?: string }[];
}> {
  const historyRaw = await deps.session.loadSession(input.sessionId);
  const history = historyRaw.map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.role === "assistant" && m.reasoning ? { reasoning: m.reasoning } : {}),
  })) as { role: "user" | "assistant" | "system"; content: string; reasoning?: string }[];

  const citations = await deps.recall.recallForPrompt(
    input.userText,
    deps.ftsLimit,
    deps.recallTokenBudget,
  );
  const ws = deps.workspace
    ? await deps.workspace.searchSnippets(input.userText, deps.workspaceSnippetLimit)
    : [];
  const evidence = buildEvidenceAppendix(citations, ws);
  const webSearch = createWebSearchFromEnv();
  const pre = await runServerWebPrefetch(webSearch, input.userText);
  const systemAppend = [evidence, pre.systemAppend].filter(Boolean).join("\n\n");
  const forceFirstToolChoice =
    !pre.skipped && pre.hitCount === 0 ?
      ({ type: "function" as const, function: { name: "web_search" } })
    : undefined;

  const openAi = createOpenAiCompatConfigFromEnv();
  const maxRounds = Math.min(
    16,
    Math.max(1, parseInt(String(process.env.MIND_AGENT_MAX_TOOL_ROUNDS ?? "8"), 10) || 8),
  );
  const budget = agentCompletionBudgetFromEnv();
  const skills =
    process.env.MIND_AGENT_SKILL_FILES?.trim().length ? new EnvSkillRegistry() : new NoopSkillRegistry();

  const loop = new AgentToolLoop({
    openAi,
    reader: deps.reader,
    policy: new DefaultToolPolicy(),
    webSearch,
    systemAppend: systemAppend || undefined,
    forceFirstToolChoice,
    onFinalDelta,
    onReasoningDelta,
    maxToolRounds: maxRounds,
    budget,
    mcp: new NoopMcpHost(),
    hooks: new NoopHookRegistry(),
    skills,
    delegation: new NoopDelegation(),
  });
  return { loop, pre, citations, history };
}

export async function runUnifiedAgentTurnJson(
  deps: UnifiedChatDeps,
  input: { sessionId: string; userText: string },
): Promise<{
  assistant: string;
  citations: Citation[];
  toolTrace: AgentToolCallTrace[];
  toolRounds: number;
  requestId: string;
  computeSurface?: "local" | "cloud";
}> {
  const requestId = createRequestId();
  const computeSurface = deps.computeRouting
    ? await deps.computeRouting.resolveSurface({
        sessionId: input.sessionId,
        userText: input.userText,
      })
    : undefined;

  const { loop, pre, citations, history } = await prepareLoop(deps, input, undefined);
  const out = await loop.run(input.userText, history);
  const toolTrace = mergeAgentToolTrace(pre.traces, out.toolTrace);

  await deps.session.appendMessage(input.sessionId, { role: "user", content: input.userText });
  await deps.session.appendMessage(input.sessionId, {
    role: "assistant",
    content: out.assistant,
    ...(out.reasoning ? { reasoning: out.reasoning } : {}),
  });

  await logAgent(deps.dataDirAbs, {
    toolRounds: out.toolRounds,
    textLen: input.userText.length,
    unified: true,
    requestId,
  });

  return {
    assistant: out.assistant,
    citations,
    toolTrace,
    toolRounds: out.toolRounds,
    requestId,
    computeSurface,
  };
}

export async function runUnifiedAgentTurnStream(
  deps: UnifiedChatDeps,
  input: { sessionId: string; userText: string },
  res: Response,
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const requestId = createRequestId();
  try {
    const computeSurface = deps.computeRouting
      ? await deps.computeRouting.resolveSurface({
          sessionId: input.sessionId,
          userText: input.userText,
        })
      : undefined;

    const { loop, pre, citations, history } = await prepareLoop(
      deps,
      input,
      (chunk: string) => {
        sseWrite(res, "delta", { t: chunk });
      },
      (chunk: string) => {
        sseWrite(res, "reasoning", { t: chunk });
      },
    );
    sseWrite(res, "prefetch", { traces: pre.traces, citations, computeSurface });

    const out = await loop.run(input.userText, history);
    const toolTrace = mergeAgentToolTrace(pre.traces, out.toolTrace);

    await deps.session.appendMessage(input.sessionId, { role: "user", content: input.userText });
    await deps.session.appendMessage(input.sessionId, {
      role: "assistant",
      content: out.assistant,
      ...(out.reasoning ? { reasoning: out.reasoning } : {}),
    });

    await logAgent(deps.dataDirAbs, {
      toolRounds: out.toolRounds,
      textLen: input.userText.length,
      unified: true,
      requestId,
    });

    sseWrite(res, "done", {
      assistant: out.assistant,
      ...(out.reasoning ? { reasoning: out.reasoning } : {}),
      toolRounds: out.toolRounds,
      toolTrace,
      citations,
      computeSurface,
      requestId,
    });
    res.end();
  } catch (e) {
    sseWrite(res, "error", { message: (e as Error).message });
    res.end();
  }
}
