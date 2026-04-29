/**
 * 依据用户输入的**可检验启发式**判定是否启用第二轮（校对式）生成。
 * 与 `参考/` 中子代理/路由文档的思路对齐：复杂任务分层处理，但本仓库保持单进程、无子进程编排。
 */

export interface TurnDepthDecision {
  passes: 1 | 2;
  reasons: string[];
}

export function decideTurnDepth(userText: string): TurnDepthDecision {
  const reasons: string[] = [];
  const t = userText.trim();
  if (t.length === 0) return { passes: 1, reasons };

  if (t.length >= 900) {
    reasons.push("length");
    return { passes: 2, reasons };
  }
  if ((t.match(/\?/g) ?? []).length >= 3) {
    reasons.push("multi_question");
    return { passes: 2, reasons };
  }
  if (/```[\s\S]*?```/.test(t)) {
    reasons.push("code_fence");
    return { passes: 2, reasons };
  }
  if (/(请|要求).{0,16}(分别|逐步|详细论证|证明)/.test(t)) {
    reasons.push("structured_request");
    return { passes: 2, reasons };
  }
  return { passes: 1, reasons };
}

export function clampPasses(
  desired: 1 | 2,
  maxPasses: 1 | 2,
  flagsSecondPass: boolean,
): 1 | 2 {
  if (maxPasses < 2) return 1;
  if (flagsSecondPass) return 2;
  return desired;
}
