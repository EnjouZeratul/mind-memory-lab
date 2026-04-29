/**
 * 是否在助手回合做「环境」联网检索（与具体问法无关，一条查询用用户原文截断）。
 * 显式开关：`MIND_AGENT_AMBIENT_PREFETCH=0|false|off` 关闭。
 */
export function ambientWebPrefetchEnabled(env = process.env) {
    const v = String(env.MIND_AGENT_AMBIENT_PREFETCH ?? "1").toLowerCase().trim();
    return v !== "0" && v !== "false" && v !== "off";
}
export async function runServerWebPrefetch(webSearch, userText, env = process.env) {
    if (!ambientWebPrefetchEnabled(env)) {
        return { traces: [], systemAppend: "", hitCount: 0, skipped: true };
    }
    const query = userText.replace(/\s+/g, " ").trim().slice(0, 400);
    if (!query) {
        return { traces: [], systemAppend: "", hitCount: 0, skipped: false };
    }
    let hits = [];
    try {
        hits = await webSearch.search(query, 10);
    }
    catch {
        await new Promise((r) => setTimeout(r, 400));
        try {
            hits = await webSearch.search(query, 10);
        }
        catch (e2) {
            const msg = e2.message ?? String(e2);
            const trace = {
                round: -1,
                name: "web_search",
                argumentsPreview: JSON.stringify({ query, max_results: 10 }),
                resultPreview: JSON.stringify({ error: "prefetch_network_failed", message: msg }).slice(0, 900),
                origin: "server",
            };
            return {
                traces: [trace],
                systemAppend: "\n[联网环境检索请求失败；需要外部事实时请调用 web_search；若仍失败，应如实说明无法完成检索。]\n",
                hitCount: 0,
                skipped: false,
            };
        }
    }
    const argsPreview = JSON.stringify({ query, max_results: 10 });
    const resultCompact = JSON.stringify({
        query,
        hitCount: hits.length,
        results: hits.slice(0, 8),
    });
    const trace = {
        round: -1,
        name: "web_search",
        argumentsPreview: argsPreview,
        resultPreview: resultCompact.length > 900 ? `${resultCompact.slice(0, 900)}…` : resultCompact,
        origin: "server",
    };
    let systemAppend = "";
    if (hits.length > 0) {
        const lines = hits.map((h) => `- ${h.title}: ${h.snippet}${h.url ? ` (${h.url})` : ""}`);
        systemAppend = `\n[联网检索摘要]\n${lines.join("\n")}\n`;
    }
    else {
        systemAppend =
            "\n[联网环境检索未返回条目；对可能超出训练知识截止的公开事实，请先调用 web_search 再作答。]\n";
    }
    return { traces: [trace], systemAppend, hitCount: hits.length, skipped: false };
}
export function mergeAgentToolTrace(server, model) {
    return [...server, ...(model ?? [])];
}
//# sourceMappingURL=agent-web-prefetch.js.map