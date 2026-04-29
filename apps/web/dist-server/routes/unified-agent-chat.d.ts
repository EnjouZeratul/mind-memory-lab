import type { Response } from "express";
import type { AgentToolCallTrace } from "@mind/agent-contract";
import type { ComputeRoutingPort, RecallPort, SessionPort, WorkspaceSnippetPort } from "@mind/kernel";
import type { WorkspaceReader } from "@mind/workspace";
export type Citation = {
    path: string;
    chunkId: string;
    excerpt: string;
};
export interface UnifiedChatDeps {
    session: SessionPort;
    recall: RecallPort;
    workspace: WorkspaceSnippetPort | undefined;
    reader: WorkspaceReader;
    ftsLimit: number;
    recallTokenBudget: number;
    workspaceSnippetLimit: number;
    dataDirAbs: string;
    computeRouting?: ComputeRoutingPort;
}
export declare function runUnifiedAgentTurnJson(deps: UnifiedChatDeps, input: {
    sessionId: string;
    userText: string;
}): Promise<{
    assistant: string;
    citations: Citation[];
    toolTrace: AgentToolCallTrace[];
    toolRounds: number;
    requestId: string;
    computeSurface?: "local" | "cloud";
}>;
export declare function runUnifiedAgentTurnStream(deps: UnifiedChatDeps, input: {
    sessionId: string;
    userText: string;
}, res: Response): Promise<void>;
//# sourceMappingURL=unified-agent-chat.d.ts.map