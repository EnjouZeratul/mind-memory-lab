import path from "node:path";

/** 规范化记忆库相对路径；禁止越界与非法段。 */
export function normalizeMemoryRelPath(rel: string): string {
  const n = rel.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!n) throw new Error("路径不能为空");
  if (n.includes("..") || path.isAbsolute(n)) throw new Error("非法路径");
  if (!n.toLowerCase().endsWith(".md")) throw new Error("仅支持 .md 文件");
  const segs = n.split("/").filter(Boolean);
  for (const s of segs) {
    if (s === "." || s === "..") throw new Error("非法路径段");
  }
  return segs.join("/");
}
