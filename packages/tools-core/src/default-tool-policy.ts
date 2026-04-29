import type { ToolPolicyPort } from "@mind/agent-contract";

const DENY_NAME = /\.(env|pem|key|p12|pfx)$/i;
const DENY_SEG = /(^|\/)(\.ssh\/|\.aws\/|node_modules\/)/i;

/** 单次判断：敏感路径拒绝；其余允许（仍由 WorkspaceReader 沙箱约束物理根）。 */
export class DefaultToolPolicy implements ToolPolicyPort {
  allowReadPath(relPosix: string): boolean {
    const n = relPosix.replace(/\\/g, "/");
    if (DENY_SEG.test(n)) return false;
    const base = n.split("/").pop() ?? n;
    if (DENY_NAME.test(base)) return false;
    return true;
  }
}
