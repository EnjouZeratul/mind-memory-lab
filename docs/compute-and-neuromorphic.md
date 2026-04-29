# 算力面与神经形态预留

## 本地 / 云端双算力

- **端口**：`ComputeRoutingPort`（`packages/kernel/src/extension-ports.ts`）由宿主实现，返回 `local` 或 `cloud`。
- **默认**：`apps/web/server.ts` 中 `EnvComputeRouting` 读取 `MIND_COMPUTE_DEFAULT`（`local` \| `cloud`，缺省 `local`），仅写入 `TurnResult.computeSurface` 与 API 响应，**不在首版路由到第二套模型端点**；未来实体化或边缘网关可在该端口内接入真实调度。

## 类脑 / SNN 兼容

- **端口**：`NeuromorphicHintPort.spikeBudgetFor(userText)` 返回 `{ maxSpikes } | null`，表示与 token 预算同级的标量约束占位；**不**在核心路径解析脉冲编码或芯片 ISA。
- **默认**：`NoopNeuromorphicHints` 恒为 `null`，行为与未接入硬件一致。
- **集成原则**：具体 SNN 或协处理器驱动应作为**可选宿主模块**实现上述端口；`c/` 与 `packages/kernel` 内域逻辑不依赖任何神经形态 SDK。

## 环境变量

| 变量 | 含义 |
|------|------|
| `MIND_COMPUTE_DEFAULT` | `local`（默认）或 `cloud`，供路由端口解析。 |

## 延伸阅读

- 多轮判定与 API 字段：[orchestration-depth.md](orchestration-depth.md)  
- 工程边界（无创世文件、可替换宿主）：[project-conventions.md](project-conventions.md)  
