#include "mindmem.h"

static int is_utf8_continuation(unsigned char b) { return (b & 0xC0u) == 0x80u; }

static size_t utf8_safe_hi(const unsigned char *buf, size_t len, size_t start, size_t max_chunk_bytes) {
  size_t hi = start + max_chunk_bytes;
  if (hi > len) hi = len;
  while (hi > start && is_utf8_continuation(buf[hi - 1])) hi--;
  if (hi == start) {
    if (start + 1 <= len) return start + 1;
    return start;
  }
  return hi;
}

static size_t prefer_break(const unsigned char *buf, size_t start, size_t hi) {
  for (size_t i = hi; i > start; i--) {
    if (buf[i - 1] == (unsigned char)'\n') return i;
  }
  for (size_t i = hi; i > start; i--) {
    unsigned char c = buf[i - 1];
    if (c == (unsigned char)' ' || c == (unsigned char)'\t' || c == (unsigned char)'\r') return i;
  }
  return hi;
}

size_t mind_chunk_end(const unsigned char *buf, size_t len, size_t start, size_t max_chunk_bytes) {
  if (start >= len) return len;
  size_t hi = utf8_safe_hi(buf, len, start, max_chunk_bytes);
  if (hi <= start) return start + 1 <= len ? start + 1 : len;
  size_t br = prefer_break(buf, start, hi);
  if (br <= start) return hi;
  return br;
}

size_t mind_whitespace_token_estimate(const unsigned char *data, size_t len) {
  size_t n = 0;
  int in = 0;
  for (size_t i = 0; i < len; i++) {
    unsigned char c = data[i];
    int ws = (c == ' ' || c == '\t' || c == '\n' || c == '\r');
    if (ws) {
      in = 0;
    } else if (!in) {
      in = 1;
      n++;
    }
  }
  return n;
}
