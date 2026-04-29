import fs from "node:fs/promises";
import path from "node:path";

export async function appendMemoryEvent(
  dataDirAbs: string,
  event: Record<string, unknown>,
): Promise<void> {
  const dir = path.join(dataDirAbs, ".mind");
  await fs.mkdir(dir, { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n";
  await fs.appendFile(path.join(dir, "events.jsonl"), line, "utf8");
}
