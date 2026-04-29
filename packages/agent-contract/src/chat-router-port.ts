/**
 * 对话交付策略：统一走「记忆/工作区证据 + 工具链」由模型自行决定是否联网与读盘；
 * 或保留仅记忆编排管线（兼容旧行为）。
 */
export type ChatDeliveryMode = "unified_agent" | "memory_pipeline";

export function chatDeliveryModeFromEnv(env: NodeJS.ProcessEnv = process.env): ChatDeliveryMode {
  const v = String(env.MIND_CHAT_DELIVERY ?? "unified_agent").toLowerCase().trim();
  if (v === "memory" || v === "memory_pipeline") return "memory_pipeline";
  return "unified_agent";
}

export interface ChatRoutingContext {
  userText: string;
}

/**
 * 后续可接入「小模型/规则/设备上下文」做自动判定；首版由 `chatDeliveryModeFromEnv` 定默认，
 * 以便演进为完全体宿主路由而不改 HTTP 契约。
 */
export interface ChatRouterPort {
  resolveDelivery(ctx: ChatRoutingContext): Promise<ChatDeliveryMode>;
}

/** 环境驱动；`resolveDelivery` 暂忽略上下文，占位供后续策略注入。 */
export class EnvChatRouter implements ChatRouterPort {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async resolveDelivery(_ctx: ChatRoutingContext): Promise<ChatDeliveryMode> {
    return chatDeliveryModeFromEnv(this.env);
  }
}
