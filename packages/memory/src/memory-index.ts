import type { Dirent } from "node:fs";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { chunkUtf8, fingerprintHex } from "./native_chunk.js";

export interface MemoryIndexOptions {
  dataDirAbs: string;
  maxChunkBytes: number;
}

export interface SearchHit {
  path: string;
  chunkId: string;
  body: string;
  score: number;
}

export class MemoryIndex {
  private db!: Database.Database;
  private readonly memRoot: string;
  private readonly idxPath: string;
  private readonly maxChunkBytes: number;

  constructor(opts: MemoryIndexOptions) {
    this.memRoot = path.join(opts.dataDirAbs, "memory");
    this.idxPath = path.join(opts.dataDirAbs, ".mind", "index.sqlite");
    this.maxChunkBytes = opts.maxChunkBytes;
  }

  open(): void {
    mkdirSync(path.dirname(this.idxPath), { recursive: true });
    this.db = new Database(this.idxPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        mtime_ms INTEGER NOT NULL,
        hash_hex TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks USING fts5(
        path UNINDEXED,
        chunk_id UNINDEXED,
        body,
        tokenize = 'porter'
      );
    `);
  }

  close(): void {
    this.db.close();
  }

  async syncFromDisk(): Promise<void> {
    await fs.mkdir(this.memRoot, { recursive: true });
    const files = await walkMarkdown(this.memRoot);
    const sel = this.db.prepare(
      "SELECT mtime_ms, hash_hex FROM files WHERE path = ?",
    );
    const delChunks = this.db.prepare("DELETE FROM chunks WHERE path = ?");
    const insChunk = this.db.prepare(
      "INSERT INTO chunks(path, chunk_id, body) VALUES (?, ?, ?)",
    );
    const upsertFile = this.db.prepare(
      `INSERT INTO files(path, mtime_ms, hash_hex) VALUES (@path, @mtime_ms, @hash_hex)
       ON CONFLICT(path) DO UPDATE SET mtime_ms=@mtime_ms, hash_hex=@hash_hex`,
    );
    const tx = this.db.transaction((list: { rel: string; abs: string }[]) => {
      for (const f of list) {
        const st = statSync(f.abs);
        const raw = readFileSync(f.abs);
        const hash = fingerprintHex(new Uint8Array(raw));
        const row = sel.get(f.rel) as { mtime_ms: number; hash_hex: string } | undefined;
        if (row && row.mtime_ms === Math.trunc(st.mtimeMs) && row.hash_hex === hash) continue;
        delChunks.run(f.rel);
        const parts = chunkUtf8(new Uint8Array(raw), this.maxChunkBytes);
        let i = 0;
        for (const p of parts) {
          const body = new TextDecoder("utf8", { fatal: false }).decode(p);
          const chunkId = `${f.rel}#${i++}`;
          insChunk.run(f.rel, chunkId, body);
        }
        upsertFile.run({
          path: f.rel,
          mtime_ms: Math.trunc(st.mtimeMs),
          hash_hex: hash,
        });
      }
    });
    tx(files);
  }

  search(query: string, limit: number, offset = 0): SearchHit[] {
    const q = escapeFtsQuery(query.trim());
    if (!q) return [];
    const stmt = this.db.prepare(
      `SELECT path, chunk_id, body, bm25(chunks) AS s
       FROM chunks WHERE chunks MATCH ?
       ORDER BY s
       LIMIT ? OFFSET ?`,
    );
    const rows = stmt.all(q, limit, offset) as {
      path: string;
      chunk_id: string;
      body: string;
      s: number;
    }[];
    return rows.map((r) => ({
      path: r.path,
      chunkId: r.chunk_id,
      body: r.body,
      score: r.s,
    }));
  }
}

function escapeFtsQuery(q: string): string {
  return q.replace(/"/g, '""');
}

async function walkMarkdown(root: string): Promise<{ rel: string; abs: string }[]> {
  const out: { rel: string; abs: string }[] = [];
  async function walk(dir: string, relPrefix: string): Promise<void> {
    let ents: Dirent[];
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
