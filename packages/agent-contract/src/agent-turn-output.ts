/** 单次工具调用摘要（供前端时间线展示，非完整载荷）。 */
export interface AgentToolCallTrace {
  /** 模型侧从 0 起；服务端预检索为 -1。 */
  round: number;
  name: string;
  argumentsPreview: string;
  resultPreview: string;
  /** `server`：路由层预检索；缺省为模型发起。 */
  origin?: "model" | "server";
}

export interface AgentTurnOutput {
  assistant: string;
  /** 流式或模型返回的思考过程；无则缺省。 */
  reasoning?: string;
  toolRounds: number;
  toolTrace?: AgentToolCallTrace[];
}
