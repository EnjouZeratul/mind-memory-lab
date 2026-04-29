import fs from "node:fs/promises";
import path from "node:path";
import { joinFrontmatter, splitFrontmatter } from "./frontmatter-parse.js";
import { normalizeMemoryRelPath } from "./memory-path-guard.js";
import type { MemoryLayer, MemoryStatus } from "./memory-meta.js";

export interface MemoryDocPatch {
  title?: string;
  layer?: MemoryLayer;
  status?: MemoryStatus;
  tags?: string[];
  supersedes?: string;
  trace_id?: string;
  body?: string;
}

export async function patchMemoryDoc(
  memoryRootAbs: string,
  rel: string,
  patch: MemoryDocPatch,
): Promise<void> {
  const safe = normalizeMemoryRelPath(rel);
  const abs = path.join(memoryRootAbs, ...safe.split("/"));
  const raw = await fs.readFile(abs, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const next = { ...frontmatter };
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.layer !== undefined) next.layer = patch.layer;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.tags !== undefined) next.tags = patch.tags;
  if (patch.supersedes !== undefined) next.supersedes = patch.supersedes;
  if (patch.trace_id !== undefined) next.trace_id = patch.trace_id;
  const nextBody = patch.body !== undefined ? patch.body : body;
  await fs.writeFile(abs, joinFrontmatter(next, nextBody), "utf8");
}
