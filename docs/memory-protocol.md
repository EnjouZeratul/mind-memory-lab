# 记忆落盘与 HTTP 协议

供工具、自动化与本地 API 对齐；**用户界面不应复述**本节中的栈名或链路措辞（见 [project-conventions.md](project-conventions.md)）。

## 存储根与文件形态

落盘路径根：`{dataDir}/memory/`。单条为 Markdown，顶部 YAML frontmatter + 正文。

## Frontmatter 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 标题 |
| `created` | string ISO8601 | 创建时间 |
| `layer` | `working` \| `longterm` \| `archive` | 默认 `longterm` |
| `status` | `draft` \| `stable` \| `archived` | 新建默认 `draft`；缺省字段的旧文件按解析规则回退为 `stable` |
| `archived_at` | string 可选 | 归档操作时写入 |
| `supersedes` | string 可选 | 被替代条目的相对路径 |
| `trace_id` | string 可选 | 与回合追踪对齐 |
| `tags` | string[] 可选 | 标签 |

## HTTP（本地 API）

- `POST /api/memory`：`{ category, title, body, tags?, layer?, status?, supersedes? }`
- `PATCH /api/memory/doc`：`{ path, title?, layer?, status?, tags?, supersedes?, trace_id?, body? }`
- `POST /api/memory/archive`：`{ path, move? }`；`move=true` 时移入 `memory/archive/YYYY/MM/…`

## 可选审计

环境变量 `MIND_MEMORY_EVENTS=1` 时向 `{dataDir}/.mind/events.jsonl` 追加单行 JSON（`patch` / `archive` 等）。

## 延伸阅读

- 索引如何跟随磁盘变更：[indexing-and-retrieval.md](indexing-and-retrieval.md)  
- 编排侧如何消费检索结果：[runtime-and-data-flow.md](runtime-and-data-flow.md)  
