import React, { useState } from "react";
import { OffsetPagination } from "../components/pagination.js";

type Hit = { path: string; chunkId: string; body: string; score: number };

export function SearchView(props: { onOpenDoc: (path: string) => void }): React.ReactElement {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [offset, setOffset] = useState(0);
  const limit = 12;
  const [err, setErr] = useState("");

  const run = async (nextOffset: number) => {
    setErr("");
    const r = await fetch(
      `/api/memory/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${nextOffset}`,
    );
    const j = (await r.json()) as { hits: Hit[]; error?: string };
    if (!r.ok) {
      setErr(j.error ?? "检索失败");
      return;
    }
    setHits(j.hits);
    setOffset(nextOffset);
  };

  return (
    <div className="view-search">
      <header>记忆检索</header>
      <section>
        <div className="search-bar">
          <input
            className="field-input"
            style={{ flex: 1 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="检索词"
          />
          <button type="button" onClick={() => void run(0)}>
            检索
          </button>
        </div>
        {err ? <p className="muted">{err}</p> : null}
        <ul className="hit-list">
          {hits.map((h) => (
            <li key={h.chunkId} className="hit-item">
              <div className="hit-snippet">{h.body}</div>
              <div className="cite">
                {h.path} · {h.chunkId}
              </div>
              <button type="button" className="secondary table-btn" onClick={() => props.onOpenDoc(h.path)}>
                打开文档
              </button>
            </li>
          ))}
        </ul>
        <OffsetPagination
          offset={offset}
          limit={limit}
          hasMore={hits.length === limit}
          onPrev={() => void run(Math.max(0, offset - limit))}
          onNext={() => void run(offset + limit)}
        />
      </section>
    </div>
  );
}
