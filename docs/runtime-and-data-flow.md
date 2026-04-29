# 运行时与数据流

## 数据流

默认（`MIND_CHAT_DELIVERY=unified_agent`）下，用户输入经会话存储载入历史，并由 `RecallPort` + 工作区片段组装为证据附录，与 `AgentToolLoop` 合并；是否调用 `web_search` 等工具由模型决定。`memory_pipeline` 时仍走 `TurnPipeline`（两轮编排 + 低置信细化）。长期记忆由用户显式写入或后续工具链接扩展。

## 安全边界

- API 密钥仅存在于服务端环境变量；浏览器不持有密钥。
- 工作区读取受根路径与大小限制约束，并叠加 `.gitignore` 与可选 `memory.ignore`（若提供路径）。

## 编排扩展（多轮与算力）

- 何时启用第二轮生成及聊天 API 附带字段：[orchestration-depth.md](orchestration-depth.md)  
- 本地/云端算力面与神经形态窄端口：[compute-and-neuromorphic.md](compute-and-neuromorphic.md)  
- **带工具的编码回合**：`POST /api/agent/turn`（JSON 一次返回）；`POST /api/agent/turn/stream`（SSE：`prefetch`、`delta`、`done`）；体为 `text` + 可选 `history`。助手回合默认用用户原文做一次环境联网检索（与问法无关），可用 `MIND_AGENT_AMBIENT_PREFETCH=0` 关闭。规格见 [plan-agent-parity.md](plan-agent-parity.md)。  

## 统一助手对话流（`MIND_CHAT_DELIVERY=unified_agent`）

Web 主对话走 `POST /api/chat/stream`，请求体为 `sessionId` + `text`。服务端将历史从 `SessionStore` 读出，经 `runUnifiedAgentTurnStream` 驱动 `AgentToolLoop`；助手回复落盘时除 `content` 外可带可选字段 **`reasoning`**（与 OpenAI 兼容流里 `choices[0].delta.reasoning_content` 对齐；部分网关亦可能用 `delta.reasoning` 别名）。

**SSE 事件（`text/event-stream`）**

| 事件 | 载荷要点 |
|------|-----------|
| `prefetch` | 预检索工具轨迹、引用列表、可选 `computeSurface` |
| `reasoning` | 思考片段：`{ "t": string }`，与正文增量同一键名，便于前端对称处理 |
| `delta` | 正文片段：`{ "t": string }` |
| `done` | `assistant`、`toolTrace`、`citations` 等；若本轮有思考则含 **`reasoning`**（完整串） |
| `error` | `{ "message": string }` |

仅当上游模型在流式 `chat/completions` 中实际下发 **`reasoning_content`**（例如 DashScope 上的 **DeepSeek R1**）时，才会出现 `reasoning` 事件与非空的持久化 `reasoning`；普通模型行为与仅正文流一致。多轮请求中，已存盘的助手 **`reasoning`** 会作为 **`reasoning_content`** 写回助手消息，供兼容端延续上下文（与仓库外 HR_system 侧习惯对齐）。

## 延伸阅读

- 模块级目标与目录表：[architecture-overview.md](architecture-overview.md)  
- 检索与索引机制：[indexing-and-retrieval.md](indexing-and-retrieval.md)  
- 记忆落盘与 HTTP 契约：[memory-protocol.md](memory-protocol.md)  
