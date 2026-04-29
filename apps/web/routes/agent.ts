import type { Express, Request, Response } from "express";
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
import { appendMemoryEvent } from "@mind/memory";
import { DefaultToolPolicy } from "@mind/tools-core";
import type { WorkspaceReader } from "@mind/workspace";
import { mergeAgentToolTrace, runServerWebPrefetch } from "./agent-web-prefetch.js";

export interface AgentRoutesDeps {
  workspaceReader: WorkspaceReader;
  dataDirAbs: string;
}

async function logAgentEvent(dataDirAbs: string, payload: Record<string, unknown>): Promise<void> {
  if (process.env.MIND_AGENT_EVENTS !== "1") return;
  await appendMemoryEvent(dataDirAbs, { kind: "agent", ...payload });
}

function writeSse(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function registerAgentRoutes(app: Express, deps: AgentRoutesDeps): void {
  app.post("/api/agent/turn", (req: Request, res: Response) => {
    void (async () => {
      try {
        const body = req.body as {
          text?: string;
          history?: { role: "user" | "assistant" | "system"; content: string }[];
        };
        const text = String(body.text ?? "").trim();
        if (!text) {
          res.status(400).json({ error: "text 为必填字段。" });
          return;
        }
        const openAi = createOpenAiCompatConfigFromEnv();
        const maxRounds = Math.min(
          16,
          Math.max(1, parseInt(String(process.env.MIND_AGENT_MAX_TOOL_ROUNDS ?? "8"), 10) || 8),
        );
        const budget = agentCompletionBudgetFromEnv();
        const webSearch = createWebSearchFromEnv();
        const pre = await runServerWebPrefetch(webSearch, text);
        const forceFirstToolChoice =
          !pre.skipped && pre.hitCount === 0 ?
            ({ type: "function" as const, function: { name: "web_search" } })
          : undefined;
        const skills =
          process.env.MIND_AGENT_SKILL_FILES?.trim().length ?
            new EnvSkillRegistry()
          : new NoopSkillRegistry();
        const loop = new AgentToolLoop({
          openAi,
          reader: deps.workspaceReader,
          policy: new DefaultToolPolicy(),
          webSearch,
          systemAppend: pre.systemAppend,
          forceFirstToolChoice,
          maxToolRounds: maxRounds,
          budget,
          mcp: new NoopMcpHost(),
          hooks: new NoopHookRegistry(),
          skills,
          delegation: new NoopDelegation(),
        });
        const history = Array.isArray(body.history) ? body.history : [];
        const out = await loop.run(text, history);
        const toolTrace = mergeAgentToolTrace(pre.traces, out.toolTrace);
        await logAgentEvent(deps.dataDirAbs, {
          toolRounds: out.toolRounds,
          textLen: text.length,
        });
        res.json({
          assistant: out.assistant,
          toolRounds: out.toolRounds,
          toolTrace,
        });
      } catch (e) {
        res.status(500).json({ error: (e as Error).message });
      }
    })();
  });

  app.post("/api/agent/turn/stream", (req: Request, res: Response) => {
    void (async () => {
      const body = req.body as {
        text?: string;
        history?: { role: "user" | "assistant" | "system"; content: string }[];
      };
      const text = String(body.text ?? "").trim();
      if (!text) {
        res.status(400).json({ error: "text 为必填字段。" });
        return;
      }
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      if (typeof res.flushHeaders === "function") res.flushHeaders();
      try {
        const openAi = createOpenAiCompatConfigFromEnv();
        const maxRounds = Math.min(
          16,
          Math.max(1, parseInt(String(process.env.MIND_AGENT_MAX_TOOL_ROUNDS ?? "8"), 10) || 8),
        );
        const budget = agentCompletionBudgetFromEnv();
        const webSearch = createWebSearchFromEnv();
        const pre = await runServerWebPrefetch(webSearch, text);
        writeSse(res, "prefetch", { traces: pre.traces });
        const forceFirstToolChoice =
          !pre.skipped && pre.hitCount === 0 ?
            ({ type: "function" as const, function: { name: "web_search" } })
          : undefined;
        const skills =
          process.env.MIND_AGENT_SKILL_FILES?.trim().length ?
            new EnvSkillRegistry()
          : new NoopSkillRegistry();
        const loop = new AgentToolLoop({
          openAi,
          reader: deps.workspaceReader,
          policy: new DefaultToolPolicy(),
          webSearch,
          systemAppend: pre.systemAppend,
          forceFirstToolChoice,
          onFinalDelta: (chunk: string) => {
            writeSse(res, "delta", { t: chunk });
          },
          maxToolRounds: maxRounds,
          budget,
          mcp: new NoopMcpHost(),
          hooks: new NoopHookRegistry(),
          skills,
          delegation: new NoopDelegation(),
        });
        const history = Array.isArray(body.history) ? body.history : [];
        const out = await loop.run(text, history);
        const toolTrace = mergeAgentToolTrace(pre.traces, out.toolTrace);
        await logAgentEvent(deps.dataDirAbs, {
          toolRounds: out.toolRounds,
          textLen: text.length,
        });
        writeSse(res, "done", {
          assistant: out.assistant,
          toolRounds: out.toolRounds,
          toolTrace,
        });
        res.end();
      } catch (e) {
        writeSse(res, "error", { message: (e as Error).message });
        res.end();
      }
    })();
  });
}
