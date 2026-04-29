import fs from "node:fs/promises";
import path from "node:path";

export interface SessionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  /** 与 OpenAI 兼容流式 `delta.reasoning_content` 对齐；仅部分模型（如 DeepSeek R1）会产出。 */
  reasoning?: string;
  ts: number;
}

export interface SessionListEntry {
  id: string;
  updatedAt: number;
  /** 末条用户/助手消息摘要，用于列表展示 */
  preview: string;
}

export class SessionStore {
  constructor(private readonly dataDirAbs: string) {}

  private file(id: string): string {
    return path.join(this.dataDirAbs, "sessions", `${id}.json`);
  }

  /** 仅允许安全 id 片段，防止路径穿越。 */
  private static isSafeSessionId(id: string): boolean {
    return /^[a-zA-Z0-9_-]{1,80}$/.test(id);
  }

  /** 若不存在则写入空数组，便于新会话立即可选。 */
  async ensureSession(id: string): Promise<void> {
    if (!SessionStore.isSafeSessionId(id)) {
      throw new Error("invalid_session_id");
    }
    const fp = this.file(id);
    try {
      await fs.access(fp);
    } catch {
      await fs.mkdir(path.dirname(fp), { recursive: true });
      await fs.writeFile(fp, "[]", "utf8");
    }
  }

  /** 按文件修改时间倒序列出会话（用于侧栏）。 */
  async listSessions(max = 60): Promise<SessionListEntry[]> {
    const dir = path.join(this.dataDirAbs, "sessions");
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch {
      return [];
    }
    const cap = Math.min(120, Math.max(1, max));
    const out: SessionListEntry[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const id = name.slice(0, -".json".length);
      if (!SessionStore.isSafeSessionId(id)) continue;
      const fp = path.join(dir, name);
      const st = await fs.stat(fp).catch(() => null);
      if (!st) continue;
      let preview = "";
      try {
        const raw = await fs.readFile(fp, "utf8");
        const arr = JSON.parse(raw) as SessionMessage[];
        if (Array.isArray(arr)) {
          const tail = [...arr].reverse().find((m) => m.role === "user" || m.role === "assistant");
          preview = tail?.content?.replace(/\s+/g, " ").trim().slice(0, 80) ?? "";
        }
      } catch {
        /* 忽略损坏文件 */
      }
      out.push({ id, updatedAt: st.mtimeMs, preview });
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    return out.slice(0, cap);
  }

  async load(id: string): Promise<SessionMessage[]> {
    try {
      const raw = await fs.readFile(this.file(id), "utf8");
      const arr = JSON.parse(raw) as SessionMessage[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  async append(id: string, msg: SessionMessage): Promise<void> {
    const cur = await this.load(id);
    cur.push(msg);
    await fs.mkdir(path.dirname(this.file(id)), { recursive: true });
    await fs.writeFile(this.file(id), JSON.stringify(cur, null, 2), "utf8");
  }
}
