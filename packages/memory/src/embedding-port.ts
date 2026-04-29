/**
 * 预留：向量检索宿主实现（当前首版未接入具体嵌入服务）。
 * 未来自研语言运行时亦可实现此端口并以 FFI 暴露。
 */
export interface EmbeddingPort {
  embed(text: string): Promise<Float32Array>;
}
