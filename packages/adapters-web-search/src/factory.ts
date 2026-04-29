import type { WebSearchPort } from "@mind/agent-contract";
import { noopWebSearchPort } from "@mind/agent-contract";
import { DuckDuckGoWebSearch } from "./duckduckgo.js";
import { TavilyWebSearch } from "./tavily.js";

/**
 * 按环境装配联网检索：可选 Tavily（需密钥），否则 DuckDuckGo Instant Answer；
 * `MIND_WEB_SEARCH_PROVIDER=none` 时关闭（返回空列表）。
 */
export function createWebSearchFromEnv(env: NodeJS.ProcessEnv = process.env): WebSearchPort {
  const provider = String(env.MIND_WEB_SEARCH_PROVIDER ?? "").toLowerCase().trim();
  if (provider === "none" || provider === "off") {
    return noopWebSearchPort;
  }
  if (provider === "duckduckgo" || provider === "ddg") {
    return new DuckDuckGoWebSearch();
  }
  const tavilyKey = env.MIND_TAVILY_API_KEY?.trim();
  if (tavilyKey && (provider === "tavily" || provider === "")) {
    return new TavilyWebSearch(tavilyKey);
  }
  if (provider === "tavily" && !tavilyKey) {
    return new DuckDuckGoWebSearch();
  }
  return new DuckDuckGoWebSearch();
}
