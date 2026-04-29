# PLAN 验收清单（分阶段）

与 [plan-agent-parity.md](plan-agent-parity.md) 配合使用；每阶段完成后勾选。

## Phase A — 契约与类型

- [x] `@mind/agent-contract` 可构建、`tsc` 无报错。
- [x] `AgentTurnState`（`emptyTurnState`）有单测；类型在构建期校验。

## Phase B — 只读工具宿主

- [x] `read_file` / `list_dir` / `grep_workspace` 经 `WorkspaceReader` 沙箱与策略拒绝非法路径（见 `@mind/tools-core` 单测与实现）。
- [x] `POST /api/agent/turn` 已注册；成功体含 `assistant`、`toolRounds`。

## Phase C — 权限与审计

- [x] `DefaultToolPolicy` 拒绝 `.env` 文件名与 `node_modules`、`.ssh` 等段。
- [x] `MIND_AGENT_EVENTS=1` 时经 `appendMemoryEvent` 写入 `.mind/events.jsonl`，`kind: "agent"`。

## Phase D — MCP

- [x] `NoopMcpHost`：`listRemoteTools` 空、`invokeRemote` 返回 JSON 错误占位。

## Phase E — Hooks / Skills

- [x] `NoopHookRegistry`；技能可选 `MIND_AGENT_SKILL_FILES` + `EnvSkillRegistry`（见 `apps/web/.env.example`）。

## Phase F — 委托

- [x] `NoopDelegation` 恒 `null`；扩展见 PLAN 正文 Phase F。

## 流式思考（与 OpenAI 兼容 `reasoning_content`）

- [x] `POST /api/chat/stream`：SSE 含 `reasoning`（`{ "t": string }`），`done` 可含完整 `reasoning`；`SessionStore` 助手消息可选持久化 `reasoning`；`@mind/adapters-llm` 流式解析 `delta.reasoning_content`（及别名 `reasoning`）。

## 合入前

- [x] [convention-compliance.md](convention-compliance.md) 全表过一遍。
- [x] `npm run build:libs` / `npm run test` / `npm run lint` / `@mind/web` build 通过（合入前在本地再执行一次确认）。
