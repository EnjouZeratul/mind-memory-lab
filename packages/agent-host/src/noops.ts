import type {
  DelegationPort,
  HookRegistryPort,
  McpHostPort,
  SkillRegistryPort,
  ToolCall,
  ToolDefinition,
  ToolResult,
} from "@mind/agent-contract";

export class NoopMcpHost implements McpHostPort {
  async listRemoteTools(): Promise<ToolDefinition[]> {
    return [];
  }

  async invokeRemote(_name: string, _argsJson: string): Promise<string> {
    return JSON.stringify({ error: "mcp_not_configured" });
  }
}

export class NoopHookRegistry implements HookRegistryPort {
  async beforeTool(_call: ToolCall): Promise<void> {}
  async afterTool(_call: ToolCall, _result: ToolResult): Promise<void> {}
}

export class NoopSkillRegistry implements SkillRegistryPort {
  async resolveSkillPrompt(_skillIds: string[]): Promise<string> {
    return "";
  }
}

export class NoopDelegation implements DelegationPort {
  async delegateStructured(_goal: string, _context: string): Promise<string | null> {
    return null;
  }
}
