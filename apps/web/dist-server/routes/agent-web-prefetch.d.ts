import type { AgentToolCallTrace, WebSearchPort } from "@mind/agent-contract";
/**
 * 是否在助手回合做「环境」联网检索（与具体问法无关，一条查询用用户原文截断）。
 * 显式开关：`MIND_AGENT_AMBIENT_PREFETCH=0|false|off` 关闭。
 */
export declare function ambientWebPrefetchEnabled(env?: NodeJS.ProcessEnv): boolean;
export type ServerPrefetchResult = {
    traces: AgentToolCallTrace[];
    systemAppend: string;
    hitCount: number;
    /** 为 true 时表示本轮未跑预检索（配置关闭），路由不应据此强制首轮 tool。 */
    skipped: boolean;
};
export declare function runServerWebPrefetch(webSearch: WebSearchPort, userText: string, env?: NodeJS.ProcessEnv): Promise<ServerPrefetchResult>;
export declare function mergeAgentToolTrace(server: AgentToolCallTrace[], model?: AgentToolCallTrace[]): AgentToolCallTrace[];
//# sourceMappingURL=agent-web-prefetch.d.ts.map