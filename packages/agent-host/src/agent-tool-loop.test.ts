import assert from "node:assert/strict";
import test from "node:test";
import { builtinToolDefinitions } from "@mind/tools-core";

test("builtin 工具名集合非空", () => {
  const names = builtinToolDefinitions().map((t) => t.function.name);
  assert.ok(names.includes("read_file"));
  assert.ok(names.includes("list_dir"));
  assert.ok(names.includes("grep_workspace"));
  assert.ok(names.includes("web_search"));
});
