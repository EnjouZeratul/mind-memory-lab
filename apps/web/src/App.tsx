import type { AgentToolCallTrace } from "@mind/agent-contract";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, type NavId } from "./app-shell.js";
import { SessionSidebar, type SessionListItem } from "./components/session-sidebar.js";
import { ChatView, type ChatMsg } from "./views/chat-view.js";
import { MemoryBrowseView } from "./views/memory-browse-view.js";
import { MemoryDetailView } from "./views/memory-detail-view.js";
import { SearchView } from "./views/search-view.js";
import {
  applyResolvedTheme,
  persistThemePref,
  readThemePref,
  resolveTheme,
  type ThemePref,
} from "./theme.js";

type Route =
  | { kind: "chat" }
  | { kind: "memory" }
  | { kind: "memoryDetail"; path: string }
  | { kind: "search" };

const SESSION_ID_RE = /^[a-zA-Z0-9_-]{1,80}$/;

function readStoredSessionId(): string {
  const v = localStorage.getItem("mind_session") ?? "default";
  return SESSION_ID_RE.test(v) ? v : "default";
}

function readRailCollapsed(): boolean {
  return localStorage.getItem("mind_session_rail") === "1";
}

function parseSseBlock(block: string): { event: string; data: string } {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  return { event, data: dataLines.join("") };
}

function formatFetchError(e: unknown): string {
  const m = (e as Error).message ?? String(e);
  if (m === "Failed to fetch" || m.includes("fetch")) {
    return "无法连接服务（请确认已启动 API，默认 8787；开发环境需同时运行界面与 API）。";
  }
  return m;
}

export function App() {
  const [themePref, setThemePref] = useState<ThemePref>(() => readThemePref());
  const [sessionId, setSessionId] = useState<string>(() => readStoredSessionId());
  const [railCollapsed, setRailCollapsed] = useState<boolean>(() => readRailCollapsed());
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    applyResolvedTheme(resolveTheme(themePref));
    persistThemePref(themePref);
  }, [themePref]);

  useEffect(() => {
    if (themePref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyResolvedTheme(resolveTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themePref]);

  useEffect(() => {
    localStorage.setItem("mind_session", sessionId);
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem("mind_session_rail", railCollapsed ? "1" : "0");
  }, [railCollapsed]);

  const [route, setRoute] = useState<Route>({ kind: "chat" });
  const detailBackRef = useRef<Exclude<Route, { kind: "memoryDetail" }>>({ kind: "memory" });

  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [citations, setCitations] = useState<
    { path: string; chunkId: string; excerpt: string }[]
  >([]);
  const [status, setStatus] = useState("");

  const shellActive: NavId =
    route.kind === "chat" ? "chat" : route.kind === "search" ? "search" : "memory";

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const r = await fetch("/api/sessions");
      const j = (await r.json()) as { sessions?: SessionListItem[] };
      setSessions(Array.isArray(j.sessions) ? j.sessions : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (route.kind !== "chat") return;
    void loadSessions();
  }, [route.kind, loadSessions]);

  useEffect(() => {
    if (route.kind !== "chat") return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/messages`);
        const j = (await r.json()) as {
          messages?: { role: string; content: string; reasoning?: string }[];
          error?: string;
        };
        if (!r.ok) throw new Error(j.error ?? r.statusText);
        const raw = Array.isArray(j.messages) ? j.messages : [];
        const next: ChatMsg[] = raw
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) =>
            m.role === "assistant"
              ? {
                  role: "assistant",
                  content: m.content,
                  trace: [],
                  ...(typeof m.reasoning === "string" && m.reasoning.length > 0 ?
                    { reasoning: m.reasoning }
                  : {}),
                }
              : { role: "user", content: m.content },
          );
        if (!cancelled) {
          setMsgs(next);
          setCitations([]);
          setStatus("");
        }
      } catch (e) {
        if (!cancelled) setStatus(formatFetchError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.kind, sessionId]);

  const openDocFromMemory = (path: string) => {
    detailBackRef.current = { kind: "memory" };
    setRoute({ kind: "memoryDetail", path });
  };

  const openDocFromSearch = (path: string) => {
    detailBackRef.current = { kind: "search" };
    setRoute({ kind: "memoryDetail", path });
  };

  const newChat = async () => {
    try {
      const r = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = (await r.json()) as { id?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      const id = typeof j.id === "string" && SESSION_ID_RE.test(j.id) ? j.id : null;
      if (!id) throw new Error("无效的会话响应");
      setSessionId(id);
      setMsgs([]);
      setCitations([]);
      setStatus("");
      void loadSessions();
    } catch (e) {
      setStatus(formatFetchError(e));
    }
  };

  const send = async () => {
    const t = input.trim();
    if (!t) return;
    const sid = sessionId;
    const patchLastAssistant = (fn: (prev: ChatMsg) => ChatMsg) => {
      setMsgs((list) => {
        const next = [...list];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i]?.role === "assistant") {
            next[i] = fn(next[i]!);
            break;
          }
        }
        return next;
      });
    };
    setStatus("处理中…");
    setMsgs((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "", trace: [] }]);
    setInput("");
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, text: t }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无响应体");
      const dec = new TextDecoder();
      let carry = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += dec.decode(value, { stream: true });
        let sep: number;
        while ((sep = carry.indexOf("\n\n")) >= 0) {
          const block = carry.slice(0, sep);
          carry = carry.slice(sep + 2);
          if (!block.trim()) continue;
          const { event, data } = parseSseBlock(block);
          if (!data) continue;
          const j = JSON.parse(data) as Record<string, unknown>;
          if (event === "prefetch") {
            const traces = j.traces as AgentToolCallTrace[] | undefined;
            if (Array.isArray(traces) && traces.length > 0) {
              patchLastAssistant((prev) => ({ ...prev, trace: traces }));
            }
            const cits = j.citations as typeof citations | undefined;
            if (Array.isArray(cits)) setCitations(cits);
          } else if (event === "delta") {
            const piece = typeof j.t === "string" ? j.t : "";
            if (piece)
              patchLastAssistant((prev) => ({ ...prev, content: prev.content + piece }));
          } else if (event === "reasoning") {
            const piece = typeof j.t === "string" ? j.t : "";
            if (piece)
              patchLastAssistant((prev) => ({
                ...prev,
                reasoning: (prev.reasoning ?? "") + piece,
              }));
          } else if (event === "done") {
            const assistant = typeof j.assistant === "string" ? j.assistant : "";
            const doneReasoning =
              typeof j.reasoning === "string" && j.reasoning.length > 0 ? j.reasoning : undefined;
            const toolTrace = Array.isArray(j.toolTrace) ? (j.toolTrace as AgentToolCallTrace[]) : [];
            const cits = j.citations as typeof citations | undefined;
            if (Array.isArray(cits)) setCitations(cits);
            patchLastAssistant((prev) => ({
              ...prev,
              content: assistant || prev.content,
              ...(doneReasoning !== undefined ? { reasoning: doneReasoning } : {}),
              trace: toolTrace.length ? toolTrace : prev.trace,
            }));
          } else if (event === "error") {
            throw new Error(typeof j.message === "string" ? j.message : "流式错误");
          }
        }
      }
      setStatus("");
      void loadSessions();
    } catch (e) {
      setStatus(formatFetchError(e));
      patchLastAssistant((prev) => ({
        ...prev,
        content: prev.content || "（未能完成回复）",
      }));
      void loadSessions();
    }
  };

  const onNav = useCallback((id: NavId) => {
    if (id === "chat") setRoute({ kind: "chat" });
    else if (id === "memory") setRoute({ kind: "memory" });
    else setRoute({ kind: "search" });
  }, []);

  return (
    <AppShell
      active={shellActive}
      onNav={onNav}
      themePref={themePref}
      onThemePref={setThemePref}
    >
      {route.kind === "chat" ? (
        <div className="view-chat">
          <div className="chat-app">
            <SessionSidebar
              collapsed={railCollapsed}
              onToggleCollapse={() => setRailCollapsed((c) => !c)}
              sessions={sessions}
              activeId={sessionId}
              onSelect={(id) => setSessionId(id)}
              onNew={() => void newChat()}
              loading={sessionsLoading}
            />
            <div className="chat-main">
              <ChatView
                embedded
                msgs={msgs}
                input={input}
                setInput={setInput}
                onSend={() => void send()}
                citations={citations}
                status={status}
              />
            </div>
          </div>
        </div>
      ) : null}
      {route.kind === "memory" ? (
        <MemoryBrowseView onOpenDoc={openDocFromMemory} onWritten={() => {}} />
      ) : null}
      {route.kind === "search" ? <SearchView onOpenDoc={openDocFromSearch} /> : null}
      {route.kind === "memoryDetail" ? (
        <MemoryDetailView
          path={route.path}
          onBack={() => setRoute(detailBackRef.current)}
          onChanged={() => {}}
        />
      ) : null}
    </AppShell>
  );
}
