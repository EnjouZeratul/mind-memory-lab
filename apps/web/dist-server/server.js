import dotenv from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, ".env") });
import { createLlmFromEnv } from "@mind/adapters-llm";
import { TurnPipeline, createRequestId } from "@mind/kernel";
import { MemoryIndex, MemoryRecall, MemoryStore, SessionStore, appendMemoryEvent, archiveMemoryDoc, listMemoryCatalogPage, patchMemoryDoc, readMemoryDoc, } from "@mind/memory";
import { EnvChatRouter } from "@mind/agent-contract";
import { WorkspaceReader } from "@mind/workspace";
import { registerAgentRoutes } from "./routes/agent.js";
import { runUnifiedAgentTurnJson, runUnifiedAgentTurnStream } from "./routes/unified-agent-chat.js";
const dataDir = path.resolve(process.env.MIND_DATA_DIR ?? path.join(here, ".data"));
const memoryRoot = path.join(dataDir, "memory");
const workspaceRoot = path.resolve(process.env.MIND_WORKSPACE_ROOT ?? path.join(here, "..", ".."));
async function logMemoryEvent(kind, payload) {
    if (process.env.MIND_MEMORY_EVENTS !== "1")
        return;
    await appendMemoryEvent(dataDir, { kind, ...payload });
}
const sessionStore = new SessionStore(dataDir);
const memoryStore = new MemoryStore(dataDir);
const memoryIndex = new MemoryIndex({ dataDirAbs: dataDir, maxChunkBytes: 12_000 });
memoryIndex.open();
const recall = new MemoryRecall(memoryIndex);
const wsReader = new WorkspaceReader({
    rootAbs: workspaceRoot,
    maxFileBytes: 256_000,
});
await wsReader.init();
class SessionAdapter {
    async loadSession(id) {
        const rows = await sessionStore.load(id);
        return rows.map(({ role, content, reasoning }) => ({
            role,
            content,
            ...(typeof reasoning === "string" && reasoning.length > 0 ? { reasoning } : {}),
        }));
    }
    async appendMessage(id, msg) {
        await sessionStore.append(id, { ...msg, ts: Date.now() });
    }
}
class RecallAdapter {
    async recallForPrompt(query, ftsLimit, maxApproxTokens) {
        await memoryIndex.syncFromDisk();
        return recall.recallPacked({ query, ftsLimit, maxApproxTokens });
    }
}
class EnvComputeRouting {
    async resolveSurface(_input) {
        return process.env.MIND_COMPUTE_DEFAULT === "cloud" ? "cloud" : "local";
    }
}
class NoopNeuromorphicHints {
    async spikeBudgetFor() {
        return null;
    }
}
const maxPassesEnv = process.env.MIND_TURN_PASSES_MAX === "1" ? 1 : 2;
const pipeline = new TurnPipeline({
    llm: createLlmFromEnv(),
    session: new SessionAdapter(),
    recall: new RecallAdapter(),
    workspace: wsReader,
    ftsLimit: 12,
    recallTokenBudget: 1600,
    workspaceSnippetLimit: 4,
    maxPasses: maxPassesEnv,
    computeRouting: new EnvComputeRouting(),
    neuromorphicHints: new NoopNeuromorphicHints(),
});
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    }
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    next();
});
registerAgentRoutes(app, { workspaceReader: wsReader, dataDirAbs: dataDir });
const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,80}$/;
app.get("/api/sessions", async (_req, res) => {
    try {
        const sessions = await sessionStore.listSessions(80);
        res.json({ sessions });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/sessions", async (req, res) => {
    try {
        const raw = String(req.body?.id ?? "").trim();
        const id = raw && SESSION_ID_RE.test(raw) ? raw : randomUUID();
        await sessionStore.ensureSession(id);
        res.json({ id });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
        const sessionId = String(req.params.sessionId ?? "");
        if (!SESSION_ID_RE.test(sessionId)) {
            res.status(400).json({ error: "无效的会话 id。" });
            return;
        }
        const rows = await sessionStore.load(sessionId);
        const messages = rows
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map(({ role, content, reasoning }) => ({
            role,
            content,
            ...(typeof reasoning === "string" && reasoning.length > 0 ? { reasoning } : {}),
        }));
        res.json({ messages });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
const chatRouter = new EnvChatRouter();
const unifiedChatDeps = {
    session: new SessionAdapter(),
    recall: new RecallAdapter(),
    workspace: wsReader,
    reader: wsReader,
    ftsLimit: 12,
    recallTokenBudget: 1600,
    workspaceSnippetLimit: 4,
    dataDirAbs: dataDir,
    computeRouting: new EnvComputeRouting(),
};
app.post("/api/chat", async (req, res) => {
    try {
        const { sessionId, text } = req.body;
        if (!sessionId || !text) {
            res.status(400).json({ error: "sessionId 与 text 为必填字段。" });
            return;
        }
        if ((await chatRouter.resolveDelivery({ userText: text })) === "unified_agent") {
            const out = await runUnifiedAgentTurnJson(unifiedChatDeps, { sessionId, userText: text });
            res.json({
                assistant: out.assistant,
                citations: out.citations,
                toolTrace: out.toolTrace,
                toolRounds: out.toolRounds,
                requestId: out.requestId,
                computeSurface: out.computeSurface,
                delivery: "unified_agent",
            });
            return;
        }
        const out = await pipeline.run({ sessionId, userText: text });
        res.json({
            assistant: out.assistantText,
            citations: out.citations,
            passesUsed: out.passesUsed,
            depthReasons: out.depthReasons,
            computeSurface: out.computeSurface,
            delivery: "memory_pipeline",
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post("/api/chat/stream", async (req, res) => {
    const sse = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    try {
        const { sessionId, text } = req.body;
        if (!sessionId || !text) {
            res.status(400).json({ error: "sessionId 与 text 为必填字段。" });
            return;
        }
        if ((await chatRouter.resolveDelivery({ userText: text })) !== "unified_agent") {
            const out = await pipeline.run({ sessionId, userText: text });
            res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            if (typeof res.flushHeaders === "function")
                res.flushHeaders();
            const requestId = createRequestId();
            sse("prefetch", { traces: [], citations: out.citations, computeSurface: out.computeSurface });
            const body = out.assistantText;
            for (let i = 0; i < body.length; i += 28) {
                sse("delta", { t: body.slice(i, i + 28) });
            }
            sse("done", {
                assistant: body,
                toolRounds: 0,
                toolTrace: [],
                citations: out.citations,
                computeSurface: out.computeSurface,
                requestId,
            });
            res.end();
            return;
        }
        await runUnifiedAgentTurnStream(unifiedChatDeps, { sessionId, userText: text }, res);
    }
    catch (e) {
        if (!res.headersSent)
            res.status(500).json({ error: e.message });
    }
});
app.post("/api/memory", async (req, res) => {
    try {
        const b = req.body;
        if (!b.body) {
            res.status(400).json({ error: "body 为必填字段。" });
            return;
        }
        const rel = await memoryStore.writeNote({
            category: b.category ?? "general",
            title: b.title ?? "note",
            body: b.body,
            tags: b.tags,
            layer: b.layer,
            status: b.status,
            supersedes: b.supersedes,
        });
        await memoryIndex.syncFromDisk();
        await logMemoryEvent("memory_write", { path: rel });
        res.json({ path: rel });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get("/api/memory/entries", async (req, res) => {
    try {
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
        const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
        const category = req.query.category ? String(req.query.category) : undefined;
        const lr = String(req.query.layer ?? "");
        const sr = String(req.query.status ?? "");
        const layer = ["working", "longterm", "archive"].includes(lr)
            ? lr
            : undefined;
        const status = ["draft", "stable", "archived"].includes(sr)
            ? sr
            : undefined;
        const page = await listMemoryCatalogPage(memoryRoot, { categoryPrefix: category || undefined, layer, status }, limit, cursor);
        res.json(page);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get("/api/memory/doc", async (req, res) => {
    try {
        const p = String(req.query.path ?? "");
        if (!p) {
            res.status(400).json({ error: "path 为必填查询参数。" });
            return;
        }
        const doc = await readMemoryDoc(memoryRoot, p);
        res.json(doc);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.patch("/api/memory/doc", async (req, res) => {
    try {
        const b = req.body;
        if (!b.path) {
            res.status(400).json({ error: "path 为必填字段。" });
            return;
        }
        await patchMemoryDoc(memoryRoot, b.path, {
            title: b.title,
            layer: b.layer,
            status: b.status,
            tags: b.tags,
            supersedes: b.supersedes,
            trace_id: b.trace_id,
            body: b.body,
        });
        await memoryIndex.syncFromDisk();
        await logMemoryEvent("memory_patch", { path: b.path });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.post("/api/memory/archive", async (req, res) => {
    try {
        const b = req.body;
        if (!b.path) {
            res.status(400).json({ error: "path 为必填字段。" });
            return;
        }
        const out = await archiveMemoryDoc(memoryRoot, b.path, { move: Boolean(b.move) });
        await memoryIndex.syncFromDisk();
        await logMemoryEvent("memory_archive", { from: b.path, to: out.path, move: Boolean(b.move) });
        res.json(out);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.get("/api/memory/search", async (req, res) => {
    const q = String(req.query.q ?? "");
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
    await memoryIndex.syncFromDisk();
    const hits = recall.searchRaw(q, limit, offset);
    res.json({ hits, limit, offset });
});
app.get("/api/memory/tree", async (_req, res) => {
    const rootDir = path.join(dataDir, "memory");
    const paths = await listMarkdownRecursive(rootDir, "");
    res.json({ paths });
});
async function listMarkdownRecursive(dirAbs, rel) {
    const out = [];
    let ents;
    try {
        ents = await fs.readdir(dirAbs, { withFileTypes: true });
    }
    catch {
        return out;
    }
    for (const e of ents) {
        const childRel = rel ? `${rel}/${e.name}` : e.name;
        const abs = path.join(dirAbs, e.name);
        if (e.isDirectory())
            out.push(...(await listMarkdownRecursive(abs, childRel)));
        else if (e.isFile() && e.name.toLowerCase().endsWith(".md"))
            out.push(childRel);
    }
    return out;
}
app.listen(8787, () => {
    console.info(`API 于 http://127.0.0.1:8787 ；数据目录 ${dataDir}`);
});
//# sourceMappingURL=server.js.map