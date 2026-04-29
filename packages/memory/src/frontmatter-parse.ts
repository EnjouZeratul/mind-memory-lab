/**
 * 最小 frontmatter 解析与序列化（与 memory-store 写入格式一致）。
 */
export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function splitFrontmatter(raw: string): ParsedMarkdown {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: {}, body: raw.trimEnd() };
  }
  let i = 1;
  const fmLines: string[] = [];
  for (; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      i++;
      break;
    }
    fmLines.push(lines[i] ?? "");
  }
  const body = lines.slice(i).join("\n").replace(/^\n+/, "");
  return { frontmatter: parseYamlLike(fmLines.join("\n")), body };
}

export function joinFrontmatter(fm: Record<string, unknown>, body: string): string {
  const fmBlock = serializeYamlLike(fm);
  return `---\n${fmBlock}\n---\n\n${body.trim()}\n`;
}

function parseYamlLike(block: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of block.split(/\r?\n/)) {
    const m = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    const key = m[1]!;
    let val: unknown = m[2] ?? "";
    const s = String(val).trim();
    if (s === "true" || s === "false") val = s === "true";
    else if (/^-?\d+$/.test(s)) val = Number(s);
    else if (s.startsWith("[") || s.startsWith("{")) {
      try {
        val = JSON.parse(s);
      } catch {
        val = stripQuotes(s);
      }
    } else val = stripQuotes(s);
    out[key] = val;
  }
  return out;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function serializeYamlLike(fm: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined) continue;
    if (typeof v === "string") lines.push(`${k}: ${quoteYaml(v)}`);
    else lines.push(`${k}: ${JSON.stringify(v)}`);
  }
  return lines.join("\n");
}

function quoteYaml(s: string): string {
  if (/[:#\n\r\t]/.test(s) || s.startsWith(" ") || s.endsWith(" ")) {
    return JSON.stringify(s);
  }
  return s;
}
