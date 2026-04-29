# 编排深度与多轮生成

## 目标

在**不引入子进程子代理**（与仓库体量一致）的前提下，对复杂用户输入自动启用第二轮「校对式」补全，思路与外部参考中的任务分层、路由分流**概念对齐**，实现保持最小。

## 判定逻辑

实现位于 `packages/kernel/src/turn-depth-policy.ts`（单文件、可单测），启发式包括：

- 过长输入；
- 多问号；
- Markdown 代码围栏；
- 结构化请求用语（如「分别」「逐步」「详细论证」等）。

此外，若首轮 `ThinkingOutput.flags` 标记 `uncertain` 或 `lowConfidence`（由具体 LLM 适配器填充），在允许 `maxPasses=2` 时也会触发第二轮。

## 环境变量

| 变量 | 含义 |
|------|------|
| `MIND_TURN_PASSES_MAX` | `1` 强制单轮；缺省或其他值允许至多两轮。 |

## HTTP 响应字段

`POST /api/chat` 在 JSON 中附带 `passesUsed`、`depthReasons`、`computeSurface`（见 [compute-and-neuromorphic.md](compute-and-neuromorphic.md)），供宿主或调试使用；**不要求** Web 界面展示。

## 延伸阅读

- 算力面与类脑预留：[compute-and-neuromorphic.md](compute-and-neuromorphic.md)  
- 主数据流：[runtime-and-data-flow.md](runtime-and-data-flow.md)  
- 外部参考目录说明：[reference-notes.md](reference-notes.md)  
