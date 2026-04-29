import type { Express } from "express";
import type { WorkspaceReader } from "@mind/workspace";
export interface AgentRoutesDeps {
    workspaceReader: WorkspaceReader;
    dataDirAbs: string;
}
export declare function registerAgentRoutes(app: Express, deps: AgentRoutesDeps): void;
//# sourceMappingURL=agent.d.ts.map