import type { WebSearchHit, WebSearchPort } from "@mind/agent-contract";

export class TavilyWebSearch implements WebSearchPort {
  constructor(private readonly apiKey: string) {}

  async search(query: string, maxResults: number): Promise<WebSearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    const cap = Math.min(15, Math.max(1, maxResults));
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: q,
        max_results: cap,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(22_000),
    });
    if (!res.ok) {
      throw new Error(`tavily_http_${res.status}`);
    }
    const body = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
    };
    const rows = body.results ?? [];
    return rows.map((r) => ({
      title: String(r.title ?? "").trim() || "(untitled)",
      url: String(r.url ?? "").trim(),
      snippet: String(r.content ?? "").trim().slice(0, 1200),
    }));
  }
}
