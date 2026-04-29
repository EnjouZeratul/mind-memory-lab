import type { MemoryIndex, SearchHit } from "./memory-index.js";
import { packHitsUnderBudget, type PackedHit } from "./context-budget.js";

export interface RecallOptions {
  query: string;
  ftsLimit: number;
  maxApproxTokens: number;
}

export class MemoryRecall {
  constructor(private readonly index: MemoryIndex) {}

  searchRaw(query: string, ftsLimit: number, offset = 0): SearchHit[] {
    return this.index.search(query, ftsLimit, offset);
  }

  recallPacked(opts: RecallOptions): PackedHit[] {
    const raw = this.index.search(opts.query, opts.ftsLimit);
    return packHitsUnderBudget(raw, opts.maxApproxTokens);
  }
}

export type { PackedHit };
