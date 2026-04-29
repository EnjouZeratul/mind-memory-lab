/**
 * 预留扩展：算力放置（本地 / 云端）与类脑（SNN 等）提示预算。
 * 默认由宿主提供 no-op 实现；不在核心算法中分支具体硬件。
 */

export type ComputeSurface = "local" | "cloud";

export interface TurnRoutingInput {
  sessionId: string;
  userText: string;
}

/** 解析本轮请求应优先使用的算力面；云端路由细节由宿主实现。 */
export interface ComputeRoutingPort {
  resolveSurface(input: TurnRoutingInput): Promise<ComputeSurface>;
}

/**
 * 为将来 SNN / 神经形态协处理器预留的窄接口：
 * 仅返回与 token 预算同级的标量提示，不暴露芯片指令集。
 */
export interface NeuromorphicHintPort {
  /** 无协处理器或无预算时返回 null。 */
  spikeBudgetFor(userText: string): Promise<{ maxSpikes: number } | null>;
}
