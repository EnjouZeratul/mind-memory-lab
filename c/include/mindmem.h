/**
 * mindmem — 与宿主语言无关的记忆子系统原语（C99）。
 * 未来若以自研语言重写宿主，可保留此头文件所描述的 ABI 语义并替换实现。
 */
#ifndef MINDMEM_H
#define MINDMEM_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/** FNV-1a 64：用于内容指纹与增量索引键（与具体存储后端无关）。 */
uint64_t mind_fnv1a64(const unsigned char *data, size_t len);

/**
 * 计算下一段 UTF-8 文本块的结束位置（开区间上界，不含 buf[end]）。
 * - buf：完整缓冲区；len：总长度；start：当前块起点；max_chunk_bytes：单块字节上限。
 * 不在多字节字符中间截断；优先在换行处截断，其次空白。
 * 若无法前进（畸形输入），返回 start+1 以避免死循环。
 */
size_t mind_chunk_end(const unsigned char *buf, size_t len, size_t start, size_t max_chunk_bytes);

/**
 * 近似“词项”计数：以 ASCII 空白为分隔的非空片段数量（启发式，非语言学 token）。
 */
size_t mind_whitespace_token_estimate(const unsigned char *data, size_t len);

#ifdef __cplusplus
}
#endif

#endif /* MINDMEM_H */
