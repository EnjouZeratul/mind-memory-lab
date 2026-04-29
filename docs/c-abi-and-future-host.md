# C ABI 与未来宿主语言

## 动机

`c/` 目录中的实现刻意保持 **零 Node 依赖**，以便：

1. 在当代工具链中以 N-API 或静态链接方式接入；
2. 在未来以自研语言重写运行时后，仍可通过 **FFI / 静态链接 / 子进程协议** 复用或对照实现相同语义。

## 当前导出（`c/include/mindmem.h`）

- `mind_fnv1a64`：内容指纹；
- `mind_chunk_end`：UTF-8 安全分块上界；
- `mind_whitespace_token_estimate`：启发式词项计数（非语言学 token）。

## 版本策略

语义变更应通过 **函数别名或版本后缀**（例如 `mind_chunk_end_v2`）进行，避免静默改变既有存储与索引行为。

## 建议的对接方式

| 宿主 | 建议 |
|------|------|
| Node（本仓库） | `packages/native-mindmem`（可选） |
| 自研语言（未来） | 静态链接 `.a` / `.lib`；或定义窄 RPC（stdin/stdout JSON）作为过渡 |

## 测试对齐

TypeScript 回退实现应与 C 在随机与边界样例上保持一致性；指纹函数为强对照点，分块函数为弱对照点（需保证 UTF-8 安全与不崩溃）。

## 对话宿主与设备能力（演进位）

- **L1**：只读工作区与记忆检索（当前默认能力面）。
- **L2**：可插拔联网与 OpenAI 兼容工具链（`@mind/agent-host` + `ChatRouterPort` 占位，可由环境或后续策略切换 `MIND_CHAT_DELIVERY`）。
- **L3**：设备级动作（文件写入、进程、系统设置等）须走**单独端口与显式策略**，不得与 L1/L2 混在同一隐式路径；实现前保持未接线。

主对话默认走 **unified_agent**：会话存储中的历史 + 本轮记忆/工作区片段写入 `systemAppend`，模型自行决定是否调用 `web_search` 与只读工具，为后续「完全体宿主」替换 `ChatRouterPort.resolveDelivery` 留接口。
