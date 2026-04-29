import React, { useEffect, useState } from "react";

export function MemoryDetailView(props: {
  path: string;
  onBack: () => void;
  onChanged: () => void;
}): React.ReactElement {
  const [doc, setDoc] = useState<{
    path: string;
    frontmatter: Record<string, unknown>;
    meta: Record<string, unknown>;
    body: string;
  } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setErr("");
      const r = await fetch(`/api/memory/doc?path=${encodeURIComponent(props.path)}`);
      const j = (await r.json()) as { error?: string; body?: string };
      if (!r.ok) {
        if (!cancelled) setErr(j.error ?? "读取失败");
        return;
      }
      if (!cancelled) setDoc(j as typeof doc);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.path]);

  const archive = async (move: boolean) => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/memory/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: props.path, move }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      props.onChanged();
      props.onBack();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const markStable = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/memory/doc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: props.path, status: "stable" }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      props.onChanged();
      const r2 = await fetch(`/api/memory/doc?path=${encodeURIComponent(props.path)}`);
      setDoc((await r2.json()) as typeof doc);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view-detail">
      <header>
        <button type="button" className="secondary table-btn" onClick={props.onBack}>
          返回
        </button>
        <span style={{ marginLeft: "1rem" }}>条目</span>
      </header>
      <section>
        {err ? <p className="muted">{err}</p> : null}
        {!doc ? (
          <p className="muted">加载中…</p>
        ) : (
          <>
            <dl className="meta-dl">
              <dt>路径</dt>
              <dd className="mono">{doc.path}</dd>
              <dt>layer</dt>
              <dd>{String(doc.meta.layer)}</dd>
              <dt>status</dt>
              <dd>{String(doc.meta.status)}</dd>
              <dt>created</dt>
              <dd>{String(doc.meta.created)}</dd>
            </dl>
            <article className="doc-body">{doc.body}</article>
            <div className="detail-actions">
              <button type="button" className="secondary" disabled={busy} onClick={() => void markStable()}>
                标为稳定
              </button>
              <button type="button" className="secondary" disabled={busy} onClick={() => void archive(false)}>
                归档（仅元数据）
              </button>
              <button type="button" disabled={busy} onClick={() => void archive(true)}>
                归档并移动
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
