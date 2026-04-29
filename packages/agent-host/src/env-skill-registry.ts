import fs from "node:fs/promises";
import type { SkillRegistryPort } from "@mind/agent-contract";

/** 从环境变量读取可选技能片段（逗号分隔 UTF-8 文件路径），拼入 system。 */
export class EnvSkillRegistry implements SkillRegistryPort {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async resolveSkillPrompt(_skillIds: string[]): Promise<string> {
    const raw = this.env.MIND_AGENT_SKILL_FILES?.trim();
    if (!raw) return "";
    const parts: string[] = [];
    for (const fp of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
      try {
        const t = await fs.readFile(fp, "utf8");
        if (t.trim()) parts.push(t.trim().slice(0, 8000));
      } catch {
        /* 跳过缺失文件 */
      }
    }
    return parts.length ? `【技能片段】\n${parts.join("\n---\n")}` : "";
  }
}
