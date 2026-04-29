# 文档地图

本目录按**主题分文件**维护说明，避免单篇「创世文档」混杂目标、协议、实现细节与安全边界。新增内容时请归入既有主题文件；若出现全新横切关切，再新增独立 MD 并在本表登记。

## 建议阅读顺序

1. [架构总览](architecture-overview.md) — 目标与仓库模块分工  
2. [运行时与数据流](runtime-and-data-flow.md) — 编排与安全边界  
3. [索引与检索](indexing-and-retrieval.md) — 增量索引与检索实现要点  
4. [记忆协议与本地 API](memory-protocol.md) — 落盘格式与 HTTP 契约  
5. [工程约定](project-conventions.md) — 代码组织、文案与性能原则  
6. [约定符合性检查](convention-compliance.md) — 合入前自查表  
7. [编排深度与多轮生成](orchestration-depth.md) — 启发式双轮与 API 字段  
8. [算力面与神经形态预留](compute-and-neuromorphic.md) — 本地/云端端口与 SNN 占位  
9. [参考目录说明](reference-notes.md) — 工作区 `参考/` 的用途与边界  
10. [Agent 能力对标 PLAN](plan-agent-parity.md) — Claude Code 级路线与参考矩阵（验收见 [plan-agent-parity-checklist.md](plan-agent-parity-checklist.md)）  
11. [C ABI 与未来宿主](c-abi-and-future-host.md) — 原生边界与对接方式  

## 文档索引

| 文档 | 范围（应写什么 / 不应写什么） |
|------|------------------------------|
| [architecture-overview.md](architecture-overview.md) | 验证目标、包与目录职责表。**不写** API 字段表或索引算法细节。 |
| [runtime-and-data-flow.md](runtime-and-data-flow.md) | `TurnPipeline` 级数据流、密钥与工作区只读约束、统一助手 `POST /api/chat/stream` 的 SSE 与可选思考字段。**不写** frontmatter 规范。 |
| [indexing-and-retrieval.md](indexing-and-retrieval.md) | 增量判定、指纹、FTS、预算与向量预留。**不写** HTTP 路径列表。 |
| [memory-protocol.md](memory-protocol.md) | `{dataDir}/memory` 布局、YAML 字段、`POST/PATCH` 记忆相关 API、可选审计。**不写** C 头文件细节。 |
| [project-conventions.md](project-conventions.md) | 单文件职责、语言分工、测试与依赖策略、用户可见文案边界。**不写** 具体包内类名清单（除非约定层级）。 |
| [c-abi-and-future-host.md](c-abi-and-future-host.md) | `c/` 导出、版本策略、宿主对接。**不写** Web 或记忆 HTTP。 |
| [convention-compliance.md](convention-compliance.md) | 与 `project-conventions` 对齐的检查清单。**不写** 实现教程。 |
| [orchestration-depth.md](orchestration-depth.md) | 多轮生成判定、环境变量、聊天 API 扩展字段。**不写** 记忆 frontmatter。 |
| [compute-and-neuromorphic.md](compute-and-neuromorphic.md) | 本地/云端端口、SNN 标量预算占位。**不写** 芯片编程手册。 |
| [reference-notes.md](reference-notes.md) | `参考/` 目录角色与引用边界。**不写** 第三方项目抄录。 |
| [plan-agent-parity.md](plan-agent-parity.md) | Agent 工具链路线、参考三主轴、分阶段与边界。**不写** 具体 HTTP 字段表（见 memory-protocol / 代码）。 |
| [plan-agent-parity-checklist.md](plan-agent-parity-checklist.md) | PLAN 分阶段验收勾选。**不写** 架构总览。 |
| [architecture.md](architecture.md) | **仅索引**：指向本 README 与上表；不承载正文。 |

## Web 可见层

`apps/web/DESIGN.md` 只约束界面样式与信息架构，**不**重复上述实现说明；实现叙述一律放在本 `docs/` 目录。
