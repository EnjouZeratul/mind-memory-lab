import assert from "node:assert/strict";
import test from "node:test";
import type { WebSearchPort } from "@mind/agent-contract";
import type { WorkspaceReader } from "@mind/workspace";
import { builtinToolDefinitions, ReadonlyToolExecutor } from "./builtin-tools.js";
import { DefaultToolPolicy } from "./default-tool-policy.js";

test("ReadonlyToolExecutor 非法 JSON 参数返回错误结构", async () => {
  const reader = {
    readTextFile: async () => null,
    listDirectoryEntries: async () => [],
    searchSnippets: async () => [],
  } as unknown as WorkspaceReader;
  const ex = new ReadonlyToolExecutor(reader, new DefaultToolPolicy());
  const out = await ex.execute("read_file", "{");
  assert.ok(out.includes("invalid_json_arguments"));
});

test("ReadonlyToolExecutor web_search 走注入端口", async () => {
  const reader = {
    readTextFile: async () => null,
    listDirectoryEntries: async () => [],
    searchSnippets: async () => [],
  } as unknown as WorkspaceReader;
  const web: WebSearchPort = {
    async search(query: string, max: number) {
      assert.equal(query, "test q");
      assert.equal(max, 3);
      return [{ title: "A", url: "https://a", snippet: "S" }];
    },
  };
  const ex = new ReadonlyToolExecutor(reader, new DefaultToolPolicy(), web);
  const out = await ex.execute("web_search", JSON.stringify({ query: "test q", max_results: 3 }));
  const j = JSON.parse(out) as { results: { title: string }[] };
  assert.equal(j.results[0]?.title, "A");
});

test("builtin 定义含 web_search", () => {
  const names = builtinToolDefinitions().map((t) => t.function.name);
  assert.ok(names.includes("web_search"));
});
