import type { ToolDefinition, ToolPolicyPort, WebSearchPort } from "@mind/agent-contract";
import type { WorkspaceReader } from "@mind/workspace";

export function builtinToolDefinitions(): ToolDefinition[] {
  return [
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read a UTF-8 text file under the workspace root.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative POSIX path from workspace root" },
          },
          required: ["path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_dir",
        description: "List immediate child names in a directory under the workspace root.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative directory; empty string for root" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "grep_workspace",
        description: "Search for a literal substring in text files (bounded scan).",
        parameters: {
          type: "object",
          properties: {
            pattern: { type: "string" },
            limit: { type: "integer", description: "Max hits", default: 12 },
          },
          required: ["pattern"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "web_search",
        description:
          "Search the public web for current events, facts, or entities not present in the workspace. Prefer workspace tools for local files.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query in natural language" },
            max_results: { type: "integer", description: "Max hits (1–15)", default: 8 },
          },
          required: ["query"],
        },
      },
    },
  ];
}

export class ReadonlyToolExecutor {
  constructor(
    private readonly reader: WorkspaceReader,
    private readonly policy: ToolPolicyPort,
    private readonly webSearch?: WebSearchPort,
  ) {}

  async execute(name: string, argsJson: string): Promise<string> {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson) as Record<string, unknown>;
    } catch {
      return JSON.stringify({ error: "invalid_json_arguments" });
    }
    try {
      switch (name) {
        case "read_file": {
          const p = String(args.path ?? "");
          if (!this.policy.allowReadPath(p)) {
            return JSON.stringify({ error: "path_denied_by_policy", path: p });
          }
          const text = await this.reader.readTextFile(p.replace(/\\/g, "/"));
          if (text === null) return JSON.stringify({ error: "read_failed_or_not_found", path: p });
          return text;
        }
        case "list_dir": {
          const p = String(args.path ?? "").replace(/\\/g, "/");
          if (p && !this.policy.allowReadPath(p)) {
            return JSON.stringify({ error: "path_denied_by_policy", path: p });
          }
          const entries = await this.reader.listDirectoryEntries(p);
          if (entries === null) return JSON.stringify({ error: "not_a_directory_or_denied", path: p });
          return JSON.stringify({ entries });
        }
        case "grep_workspace": {
          const pattern = String(args.pattern ?? "");
          const limit = Math.min(50, Math.max(1, Number(args.limit) || 12));
          const hits = await this.reader.searchSnippets(pattern, limit);
          return JSON.stringify({ hits });
        }
        case "web_search": {
          if (!this.webSearch) {
            return JSON.stringify({ error: "web_search_not_configured" });
          }
          const query = String(args.query ?? "").trim();
          if (!query) return JSON.stringify({ error: "query_required" });
          const maxRaw = Number(args.max_results) || 8;
          const maxResults = Math.min(15, Math.max(1, maxRaw));
          const results = await this.webSearch.search(query, maxResults);
          return JSON.stringify({ query, results });
        }
        default:
          return JSON.stringify({ error: "unknown_tool", name });
      }
    } catch (e) {
      return JSON.stringify({ error: "tool_execution_error", message: (e as Error).message });
    }
  }
}
