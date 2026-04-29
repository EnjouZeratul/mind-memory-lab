/** 单条网页检索结果（供模型消费，不含 HTML）。 */
export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
}

/** 联网检索端口：由宿主注入具体实现（DuckDuckGo / Tavily 等）。 */
export interface WebSearchPort {
  search(query: string, maxResults: number): Promise<WebSearchHit[]>;
}

/** 禁用联网时注入；工具仍可能被调用，返回空结果列表。 */
export const noopWebSearchPort: WebSearchPort = {
  async search(): Promise<WebSearchHit[]> {
    return [];
  },
};
