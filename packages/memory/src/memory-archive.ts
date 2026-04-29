import fs from "node:fs/promises";
import path from "node:path";
import { joinFrontmatter, splitFrontmatter } from "./frontmatter-parse.js";
import { normalizeMemoryRelPath } from "./memory-path-guard.js";

export interface ArchiveOptions {
  move: boolean;
}

export async function archiveMemoryDoc(
  memoryRootAbs: string,
  rel: string,
  opts: ArchiveOptions,
): Promise<{ path: string }> {
  const safe = normalizeMemoryRelPath(rel);
  const abs = path.join(memoryRootAbs, ...safe.split("/"));
  const raw = await fs.readFile(abs, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const now = new Date().toISOString();
  const next: Record<string, unknown> = {
    ...frontmatter,
    status: "archived",
    archived_at: now,
  };

  if (!opts.move) {
    await fs.writeFile(abs, joinFrontmatter(next, body), "utf8");
    return { path: safe };
  }

  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const destRel = `archive/${yyyy}/${mm}/${safe.replace(/\//g, "__")}`;
  const destAbs = path.join(memoryRootAbs, ...destRel.split("/"));
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  const layer =
    typeof next.layer === "string" && next.layer.length > 0 ? next.layer : "archive";
  const text = joinFrontmatter({ ...next, layer }, body);
  await fs.writeFile(destAbs, text, "utf8");
  await fs.unlink(abs);
  return { path: destRel };
}
