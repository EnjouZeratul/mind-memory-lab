#include "mindmem.h"

uint64_t mind_fnv1a64(const unsigned char *data, size_t len) {
  uint64_t h = 14695981039346656037ULL;
  for (size_t i = 0; i < len; i++) {
    h ^= (uint64_t)data[i];
    h *= 1099511628211ULL;
  }
  return h;
}
