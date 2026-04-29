import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { Ignore } from "ignore";
import { resolveUnderRoot } from "./path-sandbox.js";

const require = createRequire(import.meta.url);
const createIgnore = require("ignore") as () => Ignore;

export interface WorkspaceReaderOptions {
  rootAbs: string;
  maxFileBytes: number;
  extraIgnoreFile?: string;
}

export class WorkspaceReader {
  private readonly rootAbs: string;
  private readonly maxFileBytes: number;
  private ig: Ignore | null = null;

  constructor(private readonly opts: WorkspaceReaderOptions) {
    this.rootAbs = path.resolve(opts.rootAbs);
    this.maxFileBytes = opts.maxFileBytes;
  }

  async init(): Promise<void> {
    const ig = createIgnore();
    const gi = path.join(this.rootAbs, ".gitignore");
    try {
      const txt = await fs.readFile(gi, "utf8");
      ig.add(txt);
    } catch {
      /* 无 .gitignore 则忽略 */
    }
    if (this.opts.extraIgnoreFile) {
      try {
        const ex = await fs.readFile(path.resolve(this.opts.extraIgnoreFile), "utf8");
        ig.add(ex);
      } catch {
        /* 可选 */
      }
    }
    this.ig = ig;
  }

  async readTextFile(relPosix: string): Promise<string | null> {
    await this.ensureInit();
    const abs = path.join(this.rootAbs, ...relPosix.split("/"));
    const safe = resolveUnderRoot(this.rootAbs, abs);
    if (!safe) return null;
    const st = await fs.stat(abs).catch(() => null);
    if (!st?.isFile() || st.size > this.maxFileBytes) return null;
    return fs.readFile(abs, "utf8");
  }

  /** 广度优先列出文本文件相对路径（受 ignore 与大小限制）。 */
  async listTextFiles(maxFiles: number): Promise<string[]> {
    await this.ensureInit();
    const ig = this.ig;
    if (!ig) throw new Error("WorkspaceReader 未初始化");
    const out: string[] = [];
    const stack: string[] = [""];
    while (stack.length && out.length < maxFiles) {
      const rel = stack.pop()!;
      const dirAbs = path.join(this.rootAbs, rel);
      let entries: Dirent[];
      try {
        entries = await fs.readdir(dirAbs, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const ent of entries) {
        const childRel = rel ? `${rel}/${ent.name}` : ent.name;
        const posix = childRel.split(path.sep).join("/");
        if (ig.ignores(posix)) continue;
        if (ent.isDirectory()) stack.push(childRel);
        else if (ent.isFile() && looksText(ent.name)) {
          const st = await fs.stat(path.join(dirAbs, ent.name)).catch(() => null);
          if (st && st.size <= this.maxFileBytes) out.push(posix);
        }
      }
    }
    return out;
  }

  /** 列出单级子项名称（受 ignore 约束；用于只读工具 list_dir）。 */
  async listDirectoryEntries(relPosix: string): Promise<string[] | null> {
    await this.ensureInit();
    const ig = this.ig!;
    const rel = relPosix.replace(/\\/g, "/").replace(/^\/+/, "");
    const dirAbs = rel ? path.join(this.rootAbs, ...rel.split("/")) : this.rootAbs;
    const safe = resolveUnderRoot(this.rootAbs, dirAbs);
    if (safe === null) return null;
    const posixDir = rel ? rel.split(path.sep).join("/") : "";
    if (posixDir && ig.ignores(posixDir)) return [];
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return null;
    }
    const names: string[] = [];
    for (const ent of entries) {
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      const posix = childRel.split(path.sep).join("/");
      if (ig.ignores(posix)) continue;
      names.push(ent.name);
    }
    return names.sort();
  }

  async searchSnippets(query: string, limit: number): Promise<{ path: string; text: string }[]> {
    await this.ensureInit();
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const files = await this.listTextFiles(4000);
    const hits: { path: string; text: string }[] = [];
    for (const f of files) {
      const text = await this.readTextFile(f);
      if (!text) continue;
      const low = text.toLowerCase();
      const idx = low.indexOf(q);
      if (idx === -1) continue;
      const start = Math.max(0, idx - 120);
      const end = Math.min(text.length, idx + q.length + 120);
      hits.push({ path: f, text: text.slice(start, end) });
      if (hits.length >= limit) break;
    }
    return hits;
  }

  private async ensureInit(): Promise<void> {
    if (!this.ig) await this.init();
    if (!this.ig) throw new Error("WorkspaceReader 初始化失败");
  }
}

function looksText(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return (
    ext === ".md" ||
    ext === ".txt" ||
    ext === ".ts" ||
    ext === ".tsx" ||
    ext === ".js" ||
    ext === ".json" ||
    ext === ".css" ||
    ext === ".html" ||
    ext === ".yml" ||
    ext === ".yaml"
  );
}
