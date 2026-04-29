import type { WebSearchHit, WebSearchPort } from "@mind/agent-contract";

function walkRelatedTopics(node: unknown, out: WebSearchHit[], max: number): void {
  if (out.length >= max || node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walkRelatedTopics(item, out, max);
    return;
  }
  if (typeof node !== "object") return;
  const t = node as Record<string, unknown>;
  if (typeof t.Text === "string" && typeof t.FirstURL === "string" && t.FirstURL.length > 0) {
    const text = t.Text;
    const dash = text.indexOf(" - ");
    const title = dash > 0 ? text.slice(0, dash).trim() : text.slice(0, 96).trim();
    const snippet = (dash > 0 ? text.slice(dash + 3) : text).trim().slice(0, 600);
    out.push({ title: title || "Hit", url: t.FirstURL, snippet });
    return;
  }
  if (Array.isArray(t.Topics)) walkRelatedTopics(t.Topics, out, max);
}

/** 解析 DuckDuckGo Instant Answer JSON（便于单测，不发起网络）。 */
export function parseDuckDuckGoInstantAnswer(data: unknown, maxTotal: number): WebSearchHit[] {
  const hits: WebSearchHit[] = [];
  if (!data || typeof data !== "object") return hits;
  const o = data as Record<string, unknown>;
  const abs = typeof o.AbstractText === "string" ? o.AbstractText.trim() : "";
  const absUrl = typeof o.AbstractURL === "string" ? o.AbstractURL : "";
  const heading = typeof o.Heading === "string" ? o.Heading.trim() : "摘要";
  if (abs.length > 0) {
    hits.push({
      title: heading || "摘要",
      url: absUrl,
      snippet: abs.slice(0, 2000),
    });
  }
  walkRelatedTopics(o.RelatedTopics, hits, maxTotal);
  return hits.slice(0, maxTotal);
}

export class DuckDuckGoWebSearch implements WebSearchPort {
  async search(query: string, maxResults: number): Promise<WebSearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    const cap = Math.min(15, Math.max(1, maxResults));
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&no_redirect=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MindMemoryLab/1.0",
      },
      signal: AbortSignal.timeout(18_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return parseDuckDuckGoInstantAnswer(data, cap);
  }
}
