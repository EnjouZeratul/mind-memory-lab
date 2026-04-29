import fs from "node:fs/promises";
import path from "node:path";
import { joinFrontmatter } from "./frontmatter-parse.js";
import type { MemoryLayer, MemoryStatus } from "./memory-meta.js";

export interface WriteNoteInput {
  category: string;
  title: string;
  body: string;
  tags?: string[];
  traceId?: string;
  layer?: MemoryLayer;
  status?: MemoryStatus;
  supersedes?: string;
}

export class MemoryStore {
  constructor(private readonly dataDirAbs: string) {}

  private memoryRoot(): string {
    return path.join(this.dataDirAbs, "memory");
  }

  async writeNote(input: WriteNoteInput): Promise<string> {
    const slug = slugify(input.title);
    const cat = sanitizePathSegment(input.category);
    const dir = path.join(this.memoryRoot(), cat);
    await fs.mkdir(dir, { recursive: true });
    const rel = `${cat}/${slug}.md`;
    const abs = path.join(this.memoryRoot(), rel);
    const fm: Record<string, unknown> = {
      title: input.title,
      created: new Date().toISOString(),
      layer: input.layer ?? "longterm",
      status: input.status ?? "draft",
    };
    if (input.tags?.length) fm.tags = input.tags;
    if (input.traceId) fm.trace_id = input.traceId;
    if (input.supersedes) fm.supersedes = input.supersedes;
    const text = joinFrontmatter(fm, input.body.trim());
    await fs.writeFile(abs, text, "utf8");
    return rel;
  }
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "note";
}

function sanitizePathSegment(s: string): string {
  const t = s.replace(/[/\\]/g, "-").trim() || "general";
  return t.slice(0, 64);
}
