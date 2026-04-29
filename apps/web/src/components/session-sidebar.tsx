import React from "react";

export type SessionListItem = { id: string; updatedAt: number; preview: string };

function formatSessionTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SessionSidebar(props: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  sessions: SessionListItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  loading: boolean;
}): React.ReactElement {
  if (props.collapsed) {
    return (
      <div className="session-rail session-rail-collapsed" aria-label="对话列表已收起">
        <button
          type="button"
          className="session-rail-iconbtn"
          onClick={() => props.onToggleCollapse()}
          aria-label="展开对话列表"
          title="展开"
        >
          »
        </button>
        <button
          type="button"
          className="session-rail-iconbtn session-rail-iconbtn-accent"
          onClick={() => props.onNew()}
          aria-label="新对话"
          title="新对话"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="session-rail">
      <div className="session-rail-inner">
        <div className="session-rail-head">
          <button
            type="button"
            className="session-rail-iconbtn"
            onClick={() => props.onToggleCollapse()}
            aria-label="收起对话列表"
            title="收起"
          >
            «
          </button>
          <button type="button" className="session-rail-new" onClick={() => props.onNew()}>
            新对话
          </button>
        </div>
        <nav className="session-rail-list" aria-label="历史对话">
          {props.loading ? <p className="muted session-rail-muted">加载中…</p> : null}
          {!props.loading && props.sessions.length === 0 ? (
            <p className="muted session-rail-muted">暂无记录</p>
          ) : null}
          <ul>
            {props.sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={
                    s.id === props.activeId ? "session-item session-item-active" : "session-item"
                  }
                  onClick={() => props.onSelect(s.id)}
                >
                  <span className="session-item-preview">{s.preview || "（空）"}</span>
                  <span className="session-item-meta">{formatSessionTime(s.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
