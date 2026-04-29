# 约定符合性检查清单

在合入或发布前可对照本表自查（与 [project-conventions.md](project-conventions.md) 一致）。

## 代码结构

- [x] 单文件单职责：无「万能工具箱」式巨型模块（Agent 能力在 `@mind/agent-contract` / `tools-core` / `agent-host` 与 `routes/agent.ts` 分拆）。
- [x] 入口（`apps/web/server.ts`）只做装配、环境读取与路由；领域逻辑在 `packages/*`。
- [x] `c/` 与核心类型不被 UI / Express 类型污染。

## 文档

- [x] 新主题已归入 `docs/README.md` 索引（含 [plan-agent-parity.md](plan-agent-parity.md)）。
- [x] PLAN 按主题分节，验收独立为 [plan-agent-parity-checklist.md](plan-agent-parity-checklist.md)。

## 用户界面

- [x] 无架构/实现教学句、无具体栈名（见 project-conventions「用户可见文案」）。
- [x] 样式与信息架构仍符合 `apps/web/DESIGN.md`。

## 测试与依赖

- [x] 关键不变量有测试（含 agent 预算、工具 JSON 错误、`DefaultToolPolicy`、workspace `listDirectoryEntries` 等）。
- [x] 未将可选原生模块缺失视为安装失败（`pnpm install` 可用 `--ignore-scripts` 跳过 `node-gyp`）。
