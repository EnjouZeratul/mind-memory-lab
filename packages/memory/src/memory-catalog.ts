import fs from "node:fs/promises";
import path from "node:path";
import { splitFrontmatter } from "./frontmatter-parse.js";
import type { MemoryLayer, MemoryStatus } from "./memory-meta.js";
import { normalizeMeta } from "./memory-meta.js";

export interface CatalogFilters {
  categoryPrefix?: string;
  layer?: MemoryLayer;
  status?: MemoryStatus;
}

export interface CatalogEntry {
  path: string;
  mtimeMs: number;
  category: string;
  meta: ReturnType<typeof normalizeMeta>;
}

export interface MemoryFacets {
  categories: Record<string, number>;
  layers: Record<string, number>;
  statuses: Record<string, number>;
}

export interface CatalogPageResult {
  items: CatalogEntry[];
  nextCursor: string | null;
  facets: MemoryFacets;
}

function encodeCursor(mtimeMs: number, relPath: string): string {
  return Buffer.from(JSON.stringify({ m: mtimeMs, p: relPath }), "utf8").toString("base64url");
}

export function decodeMemoryCursor(s: string | undefined): { mtimeMs: number; path: string } | null {
  if (!s) return null;
  try {
    const j = JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as { m: number; p: string };
    if (typeof j.m !== "number" || typeof j.p !== "string") return null;
    return { mtimeMs: j.m, path: j.p };
  } catch {
    return null;
  }
}

function categoryOf(rel: string): string {
  const i = rel.indexOf("/");
  return i === -1 ? "" : rel.slice(0, i);
}

function headSnippet(raw: string, max = 4096): string {
  return raw.length <= max ? raw : raw.slice(0, max);
}

export async function listMemoryCatalogPage(
  memoryRootAbs: string,
  filters: CatalogFilters,
  limit: number,
  cursor: string | undefined,
): Promise<CatalogPageResult> {
  const all = await collectEntries(memoryRootAbs);
  const facets = buildFacets(all);

  let filtered = all;
  if (filters.categoryPrefix) {
    const p = filters.categoryPrefix.replace(/\\/g, "/");
    filtered = filtered.filter((e) => e.path.startsWith(p) || e.category === p || e.path.startsWith(`${p}/`));
  }
  if (filters.layer) filtered = filtered.filter((e) => e.meta.layer === filters.layer);
  if (filters.status) filtered = filtered.filter((e) => e.meta.status === filters.status);

  const sorted = [...filtered].sort((a, b) => {
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return a.path.localeCompare(b.path);
  });

  const c = decodeMemoryCursor(cursor);
  let start = 0;
  if (c) {
    const idx = sorted.findIndex((e) => e.mtimeMs === c.mtimeMs && e.path === c.path);
    start = idx === -1 ? 0 : idx + 1;
  }

  const slice = sorted.slice(start, start + limit);
  const last = slice[slice.length - 1];
  const nextCursor =
    slice.length === limit && last ? encodeCursor(last.mtimeMs, last.path) : null;

  return { items: slice, nextCursor, facets };
}

async function collectEntries(memoryRootAbs: string): Promise<CatalogEntry[]> {
  const files = await walkMarkdown(memoryRootAbs);
  const out: CatalogEntry[] = [];
  for (const f of files) {
    const raw = await fs.readFile(f.abs, "utf8");
    const { frontmatter } = splitFrontmatter(headSnippet(raw));
    const titleFromPath = path.basename(f.rel, ".md");
    const meta = normalizeMeta(frontmatter, { title: titleFromPath });
    const st = await fs.stat(f.abs);
    out.push({
      path: f.rel,
      mtimeMs: Math.trunc(st.mtimeMs),
      category: categoryOf(f.rel),
      meta,
    });
  }
  return out;
}

function buildFacets(entries: CatalogEntry[]): MemoryFacets {
  const categories: Record<string, number> = {};
  const layers: Record<string, number> = {};
  const statuses: Record<string, number> = {};
  for (const e of entries) {
    const cat = e.category || "(root)";
    categories[cat] = (categories[cat] ?? 0) + 1;
    layers[e.meta.layer] = (layers[e.meta.layer] ?? 0) + 1;
    statuses[e.meta.status] = (statuses[e.meta.status] ?? 0) + 1;
  }
  return { categories, layers, statuses };
}

async function walkMarkdown(root: string): Promise<{ rel: string; abs: string }[]> {
  const out: { rel: string; abs: string }[] = [];
  async function walk(dir: string, relPrefix: string): Promise<void> {
    let ents: import("node:fs").Dirent[];
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const abs = path.join(dir, e.name);
      const rel = relPrefix ? `${relPrefix}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(abs, rel);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push({ rel, abs });
    }
  }
  await walk(root, "");
  return out;
}
