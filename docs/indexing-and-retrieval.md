# 索引与检索

## 增量与变更判定

- 索引默认增量：以文件 `mtime` 与内容指纹（FNV-1a 64）判定是否需要重建片段。

## 检索路径

- 检索阶段使用 FTS5 + BM25。
- 向量检索通过 `EmbeddingPort` 预留，不在首版启用。

## 延伸阅读

- 与编排、工作区组合方式：[runtime-and-data-flow.md](runtime-and-data-flow.md)  
- 记忆文件形态与写入入口：[memory-protocol.md](memory-protocol.md)  
- 指纹与分块原语边界：[c-abi-and-future-host.md](c-abi-and-future-host.md)  
