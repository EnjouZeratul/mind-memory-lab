import { agentCompletionBudgetFromEnv } from "@mind/agent-contract";
import { AgentToolLoop, EnvSkillRegistry, NoopDelegation, NoopHookRegistry, NoopMcpHost, NoopSkillRegistry, } from "@mind/agent-host";
import { createOpenAiCompatConfigFromEnv } from "@mind/adapters-llm";
import { createWebSearchFromEnv } from "@mind/adapters-web-search";
import { appendMemoryEvent } from "@mind/memory";
import { DefaultToolPolicy } from "@mind/tools-core";
import { mergeAgentToolTrace, runServerWebPrefetch } from "./agent-web-prefetch.js";
async function logAgentEvent(dataDirAbs, payload) {
    if (process.env.MIND_AGENT_EVENTS !== "1")
        return;
    await appendMemoryEvent(dataDirAbs, { kind: "agent", ...payload });
}
function writeSse(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}
export function registerAgentRoutes(app, deps) {
    app.post("/api/agent/turn", (req, res) => {
        void (async () => {
            try {
                const body = req.body;
                const text = String(body.text ?? "").trim();
                if (!text) {
                    res.status(400).json({ error: "text 为必填字段。" });
                    return;
                }
                const openAi = createOpenAiCompatConfigFromEnv();
                const maxRounds = Math.min(16, Math.max(1, parseInt(String(process.env.MIND_AGENT_MAX_TOOL_ROUNDS ?? "8"), 10) || 8));
                const budget = agentCompletionBudgetFromEnv();
                const webSearch = createWebSearchFromEnv();
                const pre = await runServerWebPrefetch(webSearch, text);
                const forceFirstToolChoice = !pre.skipped && pre.hitCount === 0 ?
                    ({ type: "function", function: { name: "web_search" } })
                    : undefined;
                const skills = process.env.MIND_AGENT_SKILL_FILES?.trim().length ?
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
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        })();
    });
    app.post("/api/agent/turn/stream", (req, res) => {
        void (async () => {
            const body = req.body;
            const text = String(body.text ?? "").trim();
            if (!text) {
                res.status(400).json({ error: "text 为必填字段。" });
                return;
            }
            res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            if (typeof res.flushHeaders === "function")
                res.flushHeaders();
            try {
                const openAi = createOpenAiCompatConfigFromEnv();
                const maxRounds = Math.min(16, Math.max(1, parseInt(String(process.env.MIND_AGENT_MAX_TOOL_ROUNDS ?? "8"), 10) || 8));
                const budget = agentCompletionBudgetFromEnv();
                const webSearch = createWebSearchFromEnv();
                const pre = await runServerWebPrefetch(webSearch, text);
                writeSse(res, "prefetch", { traces: pre.traces });
                const forceFirstToolChoice = !pre.skipped && pre.hitCount === 0 ?
                    ({ type: "function", function: { name: "web_search" } })
                    : undefined;
                const skills = process.env.MIND_AGENT_SKILL_FILES?.trim().length ?
                    new EnvSkillRegistry()
                    : new NoopSkillRegistry();
                const loop = new AgentToolLoop({
                    openAi,
                    reader: deps.workspaceReader,
                    policy: new DefaultToolPolicy(),
                    webSearch,
                    systemAppend: pre.systemAppend,
                    forceFirstToolChoice,
                    onFinalDelta: (chunk) => {
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
            }
            catch (e) {
                writeSse(res, "error", { message: e.message });
                res.end();
            }
        })();
    });
}
//# sourceMappingURL=agent.js.map