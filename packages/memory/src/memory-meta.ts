export type MemoryLayer = "working" | "longterm" | "archive";
export type MemoryStatus = "draft" | "stable" | "archived";

export interface NormalizedMemoryMeta {
  layer: MemoryLayer;
  status: MemoryStatus;
  title: string;
  created: string;
  archived_at?: string;
  supersedes?: string;
  trace_id?: string;
  tags: string[];
}

const LAYERS: MemoryLayer[] = ["working", "longterm", "archive"];
const STATUSES: MemoryStatus[] = ["draft", "stable", "archived"];

export function parseLayer(v: unknown): MemoryLayer {
  const s = String(v ?? "").trim();
  return LAYERS.includes(s as MemoryLayer) ? (s as MemoryLayer) : "longterm";
}

export function parseStatus(v: unknown): MemoryStatus {
  const s = String(v ?? "").trim();
  return STATUSES.includes(s as MemoryStatus) ? (s as MemoryStatus) : "stable";
}

export function normalizeMeta(
  fm: Record<string, unknown>,
  defaults: { title: string },
): NormalizedMemoryMeta {
  const tags = parseTags(fm.tags);
  return {
    layer: parseLayer(fm.layer),
    status: parseStatus(fm.status),
    title: typeof fm.title === "string" ? fm.title : defaults.title,
    created: typeof fm.created === "string" ? fm.created : new Date(0).toISOString(),
    archived_at: typeof fm.archived_at === "string" ? fm.archived_at : undefined,
    supersedes: typeof fm.supersedes === "string" ? fm.supersedes : undefined,
    trace_id: typeof fm.trace_id === "string" ? fm.trace_id : undefined,
    tags,
  };
}

function parseTags(v: unknown): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v) as unknown;
      if (Array.isArray(j) && j.every((x) => typeof x === "string")) return j as string[];
    } catch {
      return v ? [v] : [];
    }
  }
  return [];
}
