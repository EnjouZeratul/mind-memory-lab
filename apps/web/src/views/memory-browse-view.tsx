import React, { useCallback, useEffect, useRef, useState } from "react";
import { CursorPagination } from "../components/pagination.js";

export type CatalogItem = {
  path: string;
  mtimeMs: number;
  category: string;
  meta: {
    layer: string;
    status: string;
    title: string;
    created: string;
  };
};

export type Facets = {
  categories: Record<string, number>;
  layers: Record<string, number>;
  statuses: Record<string, number>;
};

export function MemoryBrowseView(props: {
  onOpenDoc: (path: string) => void;
  onWritten: () => void;
}): React.ReactElement {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [layer, setLayer] = useState("");
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const filtersRef = useRef({ category, layer, status });
  filtersRef.current = { category, layer, status };

  const load = useCallback(async (c: string | null) => {
    const f = filtersRef.current;
    const q = new URLSearchParams();
    q.set("limit", "15");
    if (c) q.set("cursor", c);
    if (f.category) q.set("category", f.category);
    if (f.layer) q.set("layer", f.layer);
    if (f.status) q.set("status", f.status);
    const r = await fetch(`/api/memory/entries?${q}`);
    const j = (await r.json()) as {
      items: CatalogItem[];
      nextCursor: string | null;
      facets: Facets;
      error?: string;
    };
    if (!r.ok) throw new Error(j.error ?? r.statusText);
    setItems(j.items);
    setNextCursor(j.nextCursor);
    setFacets(j.facets);
  }, []);

  useEffect(() => {
    void load(null).catch((e) => setErr((e as Error).message));
  }, [load]);

  const write = async () => {
    if (!body.trim()) return;
    setErr("");
    const r = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "manual",
        title: title.trim() || "未命名条目",
        body,
        tags: ["user"],
      }),
    });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      setErr(j.error ?? "写入失败");
      return;
    }
    setTitle("");
    setBody("");
    props.onWritten();
    await load(null);
  };

  return (
    <div className="view-memory">
      <div className="memory-sidebar">
        <header>分类与规模</header>
        <section>
          <label className="field-label">筛选分类前缀</label>
          <input
            className="field-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="例如 manual"
          />
          <label className="field-label">layer</label>
          <select className="field-input" value={layer} onChange={(e) => setLayer(e.target.value)}>
            <option value="">全部</option>
            <option value="working">working</option>
            <option value="longterm">longterm</option>
            <option value="archive">archive</option>
          </select>
          <label className="field-label">status</label>
          <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="draft">draft</option>
            <option value="stable">stable</option>
            <option value="archived">archived</option>
          </select>
          <button type="button" className="secondary" onClick={() => void load(null)}>
            应用筛选
          </button>
          {facets ? (
            <details className="facets-details">
              <summary>摘要</summary>
              <pre className="facets-pre">{JSON.stringify(facets, null, 2)}</pre>
            </details>
          ) : null}
        </section>
      </div>
      <div className="memory-main">
        <header>条目列表</header>
        <section>
          {err ? <p className="muted">{err}</p> : null}
          <table className="mem-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>路径</th>
                <th>layer</th>
                <th>status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.path}>
                  <td>{row.meta.title}</td>
                  <td className="mono">{row.path}</td>
                  <td>{row.meta.layer}</td>
                  <td>{row.meta.status}</td>
                  <td>
                    <button type="button" className="secondary table-btn" onClick={() => props.onOpenDoc(row.path)}>
                      打开
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <CursorPagination
            nextCursor={nextCursor}
            onNext={(c) => void load(c)}
            onReset={() => void load(null)}
          />
        </section>
        <header>新建条目</header>
        <section>
          <input className="field-input" placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="正文" value={body} onChange={(e) => setBody(e.target.value)} />
          <button type="button" onClick={() => void write()}>
            写入记忆库
          </button>
        </section>
      </div>
    </div>
  );
}
