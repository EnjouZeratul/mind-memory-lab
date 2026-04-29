# 架构总览

## 目标

在工程上验证一条可审计链路：**受控记忆落盘 → 增量索引 → 检索裁剪 → 与只读工作区片段一并注入模型上下文**。本原型刻意收缩编排复杂度，以便后续替换为更完整的单元池与消息总线。

## 仓库模块

| 模块 | 职责 |
|------|------|
| `c/` | 与宿主无关的原语（分块、指纹、启发式计数）；稳定 C ABI。 |
| `packages/native-mindmem` | 可选 N-API 绑定；未编译时回退 TypeScript。 |
| `packages/kernel` | 回合编排端口与 `TurnPipeline`。 |
| `packages/memory` | Markdown 写入、SQLite FTS 索引、召回与预算裁剪。 |
| `packages/workspace` | 工作区沙箱与忽略规则。 |
| `packages/adapters-llm` | 可插拔 LLM 提供商；OpenAI 兼容 tool chat 补全。 |
| `packages/agent-contract` | Agent 工具与扩展端口类型（无运行时依赖）。 |
| `packages/tools-core` | 只读内置工具与默认路径策略。 |
| `packages/agent-host` | 工具多轮编排（`AgentToolLoop`），与 `TurnPipeline` 并列。 |
| `apps/web` | 验证 UI 与本地 API（含 `/api/agent/turn` 薄路由）。 |

## 延伸阅读

- 数据流与安全边界：[runtime-and-data-flow.md](runtime-and-data-flow.md)  
- 索引与检索实现：[indexing-and-retrieval.md](indexing-and-retrieval.md)  
- 记忆格式与 API：[memory-protocol.md](memory-protocol.md)  
