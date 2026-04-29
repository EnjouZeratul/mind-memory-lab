import type { AgentToolCallTrace } from "@mind/agent-contract";
import React from "react";

export type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  trace?: AgentToolCallTrace[];
  /** 模型思考过程（如 DeepSeek R1 / DashScope reasoning_content）。 */
  reasoning?: string;
};

type Citation = { path: string; chunkId: string; excerpt: string };

function TraceBlock(props: { traces: AgentToolCallTrace[] }): React.ReactElement {
  return (
    <div className="msg-trace-block">
      {props.traces.map((tr, i) => {
        const head =
          tr.origin === "server" || tr.round < 0 ? "预检索" : `第 ${tr.round + 1} 轮`;
        return (
          <details key={i} className="msg-trace-item" open={i === props.traces.length - 1}>
            <summary className="msg-trace-sum">
              <span className="msg-trace-dot" aria-hidden />
              <span>
                {head} · {tr.name}
              </span>
            </summary>
            <div className="msg-trace-body">
              <div className="muted msg-trace-cap">参数</div>
              <pre className="msg-trace-pre">{tr.argumentsPreview}</pre>
              <div className="muted msg-trace-cap">结果</div>
              <pre className="msg-trace-pre">{tr.resultPreview}</pre>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function ChatView(props: {
  msgs: ChatMsg[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  citations: Citation[];
  status: string;
  /** 为 true 时不包裹外层 `.view-chat`，供与侧栏同排布局使用 */
  embedded?: boolean;
}): React.ReactElement {
  let lastAssistantIdx = -1;
  for (let i = props.msgs.length - 1; i >= 0; i--) {
    if (props.msgs[i]?.role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }
  const inner = (
    <div className="chat-column">
      <header className="chat-view-head">
        <span className="chat-view-title">对话</span>
      </header>
      <section className="chat-view-body">
        <div className="msg-list">
          {props.msgs.map((m, i) => (
            <div key={i} className={`msg-row msg-row-${m.role}`}>
              {m.role === "assistant" && m.reasoning ?
                <details
                  className="msg-reasoning-block"
                  open={props.status === "处理中…" && i === lastAssistantIdx}
                >
                  <summary className="msg-reasoning-sum">思考过程</summary>
                  <div className="msg-reasoning-body">{m.reasoning}</div>
                </details>
              : null}
              <div className={`msg ${m.role}`}>{m.content}</div>
              {m.role === "assistant" && m.trace && m.trace.length > 0 ? (
                <TraceBlock traces={m.trace} />
              ) : null}
            </div>
          ))}
        </div>
        {props.citations.length > 0 ? (
          <div className="chat-citations">
            <div className="chat-citations-title">引用</div>
            {props.citations.map((c) => (
              <div key={c.chunkId} className="chat-cite-card">
                <div>{c.excerpt}</div>
                <div className="cite">
                  {c.path} · {c.chunkId}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="chat-compose-shell">
          <div className="chat-compose">
            <textarea
              className="chat-compose-input"
              value={props.input}
              onChange={(e) => props.setInput(e.target.value)}
              placeholder="发送消息…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  props.onSend();
                }
              }}
            />
            <button type="button" className="chat-send-btn" onClick={() => props.onSend()}>
              发送
            </button>
          </div>
          {props.status ? <p className="muted chat-status">{props.status}</p> : null}
        </div>
      </section>
    </div>
  );
  if (props.embedded) return inner;
  return <div className="view-chat">{inner}</div>;
}
