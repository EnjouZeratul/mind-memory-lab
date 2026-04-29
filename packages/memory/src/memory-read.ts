import fs from "node:fs/promises";
import path from "node:path";
import { splitFrontmatter } from "./frontmatter-parse.js";
import { normalizeMeta, type NormalizedMemoryMeta } from "./memory-meta.js";
import { normalizeMemoryRelPath } from "./memory-path-guard.js";

export interface MemoryDocRead {
  path: string;
  frontmatter: Record<string, unknown>;
  meta: NormalizedMemoryMeta;
  body: string;
}

export async function readMemoryDoc(
  memoryRootAbs: string,
  rel: string,
): Promise<MemoryDocRead> {
  const safe = normalizeMemoryRelPath(rel);
  const abs = path.join(memoryRootAbs, ...safe.split("/"));
  const raw = await fs.readFile(abs, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const titleFromPath = path.basename(safe, ".md");
  const meta = normalizeMeta(frontmatter, { title: titleFromPath });
  return { path: safe, frontmatter, meta, body };
}
