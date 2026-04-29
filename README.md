# mind-memory-lab

**中文全称**：记忆导向智能体框架（实验室原型）

本仓库以可插拔 LLM 适配器与可替换的落盘记忆格式为核心，提供受控检索、工作区只读访问与回合级编排，用于验证长期记忆与对话连续性。

## 结构

| 路径 | 职责 |
|------|------|
| `c/` | C99 原语库（分块、指纹、启发式计数），与宿主解耦 |
| `packages/native-mindmem` | 可选 N-API 绑定（`pnpm build:native`） |
| `packages/kernel` | 回合流水线、领域类型、LLM 端口 |
| `packages/memory` | 记忆落盘、分块、SQLite FTS 索引、召回与提交 |
| `packages/workspace` | 工作区沙箱与忽略规则 |
| `packages/adapters-llm` | Anthropic / OpenAI / Ollama(OpenAI 兼容) + tool chat |
| `packages/agent-contract` | Agent 工具与 MCP/Hooks/Skills 端口类型 |
| `packages/tools-core` | 只读工作区工具与默认 `ToolPolicy` |
| `packages/agent-host` | 多轮工具编排 `AgentToolLoop` |
| `apps/web` | Web + 本地 API（`/api/chat`、`/api/chat/stream`、`/api/agent/turn` 等） |
| `docs/` | 说明文档（按主题分文件，入口见下） |

## 文档

说明按主题拆分，入口为 **[`docs/README.md`](docs/README.md)**（含索引表与阅读顺序）。旧链接 [`docs/architecture.md`](docs/architecture.md) 仍可用，正文已迁至各专题文件。合入前可按 [`docs/convention-compliance.md`](docs/convention-compliance.md) 自查。工作区 **`参考/`** 为外部项目镜像，仅作概念对照，约定见 [`docs/reference-notes.md`](docs/reference-notes.md)。

## 开发

```bash
# 若本机未安装全局 pnpm，可用 npx 拉取与 packageManager 一致的版本：
npx --yes pnpm@9.15.0 install

# 以下脚本已改为通过 npx 调用 pnpm，仅需 Node 自带的 npm 即可：
npm run build:libs
npm run dev
```

在 `apps/web` 配置环境变量（参见 `apps/web/.env.example`）。

可选：构建 C 原生加速（需本机 `node-gyp` 工具链）：

```bash
pnpm build:native
```

## 测试

```bash
pnpm test
```

## 扩展路线

向量检索、消息总线、多 ThinkingUnit 并行与外部工具协议对齐，见 [`docs/README.md`](docs/README.md) 中的架构总览与索引/检索专题。

C ABI 与未来宿主语言对接说明，见 [`docs/c-abi-and-future-host.md`](docs/c-abi-and-future-host.md)。
