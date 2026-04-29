import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { joinFrontmatter } from "./frontmatter-parse.js";
import { decodeMemoryCursor, listMemoryCatalogPage } from "./memory-catalog.js";

test("listMemoryCatalogPage 分页与游标", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mind-cat-"));
  const mem = path.join(root, "memory");
  await fs.mkdir(path.join(mem, "c1"), { recursive: true });
  const base = Date.now();
  for (let i = 0; i < 5; i++) {
    const body = joinFrontmatter(
      { title: `t${i}`, created: new Date().toISOString(), layer: "longterm", status: "draft" },
      `body ${i}`,
    );
    const fp = path.join(mem, "c1", `n${i}.md`);
    await fs.writeFile(fp, body, "utf8");
    const t = new Date(base + i * 60_000);
    await fs.utimes(fp, t, t);
  }
  const p1 = await listMemoryCatalogPage(mem, {}, 2, undefined);
  assert.equal(p1.items.length, 2);
  assert.ok(p1.nextCursor);
  const c = decodeMemoryCursor(p1.nextCursor);
  assert.ok(c);
  const p2 = await listMemoryCatalogPage(mem, {}, 2, p1.nextCursor ?? undefined);
  assert.equal(p2.items.length, 2);
  assert.notEqual(p1.items[0]!.path, p2.items[0]!.path);
});
