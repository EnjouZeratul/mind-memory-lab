# 关于 `参考/` 目录

工作区 `d:\TA\参考` 下的镜像用于**对照能力与产品概念**（工具、委托、MCP、路由、会话、记忆形态等）。本仓库**不**拷贝其中的实现或配置；实现须 **clean-room 自写**，并遵守 [plan-agent-parity.md](plan-agent-parity.md) 中的优先级与反模式（禁止规避式冗余）。

## 三主轴（实现 PLAN 时优先对照）

| 主轴 | 路径 | 用途 |
|------|------|------|
| 文档与协议叙述 | `参考/hermes-agent-main/website/docs/user-guide/` | 工具、MCP、Hooks、安全、会话、routing 等专题 MD |
| TS 行为与模块边界 | `参考/claude-code-backup/` | 分层、热路径、错误与工具编排**思路**（只读，不粘贴源码） |
| 差距清单与多语言参考 | `参考/claw-code-main/`（含 `PARITY.md`、`rust/crates/*`） | 阶段划分、Rust/Python 分层与 MVP 工具面对照 |

## 顶级目录登记表

| 目录名 | 建议用途 |
|--------|----------|
| `claude-code-backup` | TS 参考：工具池、token、终端、权限等边界 |
| `claw-code-main` | `PARITY.md` + Python/Rust 运行时 |
| `hermes-agent-main` | 用户指南文档主源 |
| `awesome-design-md-main` | 设计素材；不进运行时 |
| `fireworks-tech-graph-main` | 图/结构化知识；扩展时评估 |
| `gbrain-master` | 图记忆；与神经形态远期相关 |
| `glass-main` | UI 参考；与 `apps/web/DESIGN.md` 冲突时以 DESIGN 为准 |
| `khoj-master` | 本地 RAG；与 `@mind/memory` 对照 |
| `logseq-master` / `Trilium-main` / `trilium-translation-main` | 双链笔记；与 memory 协议长期相关 |
| `quivr-main` | RAG/聊天栈参考 |
| `Second-Me-master` | 数字孪生；远期 |
| `supermemory-main` | 记忆 API 形态参考 |
| `superpowers-main` | 技能编排；与 Hermes skills 交叉 |

集成到本仓库时：

- 受 [project-conventions.md](project-conventions.md) 约束：单文件职责、入口薄装配、UI 不写栈名与架构教学句。
- 新能力经 **新包与端口**（如 `@mind/agent-contract`、`@mind/tools-core`、`@mind/agent-host`），而非在 `TurnPipeline` 或 `server.ts` 内堆叠无关逻辑。
