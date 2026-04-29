import { approxTokenCount } from "./native_chunk.js";
import type { SearchHit } from "./memory-index.js";

export interface PackedHit {
  path: string;
  chunkId: string;
  excerpt: string;
}

/** 以启发式 token 计数将检索结果裁剪到预算内。 */
export function packHitsUnderBudget(
  hits: SearchHit[],
  maxApproxTokens: number,
): PackedHit[] {
  const out: PackedHit[] = [];
  let used = 0;
  const enc = new TextEncoder();
  for (const h of hits) {
    const line = `[${h.chunkId}] ${h.body}\n`;
    const cost = approxTokenCount(enc.encode(line));
    if (used + cost > maxApproxTokens) break;
    used += cost;
    out.push({ path: h.path, chunkId: h.chunkId, excerpt: h.body });
  }
  return out;
}
