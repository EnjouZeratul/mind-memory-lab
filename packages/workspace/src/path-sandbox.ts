import path from "node:path";

/** 将候选路径限制在 root 之下，返回规范化相对 POSIX 路径；越界则返回 null。 */
export function resolveUnderRoot(rootAbs: string, candidateAbs: string): string | null {
  const root = path.resolve(rootAbs);
  const abs = path.resolve(candidateAbs);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}
