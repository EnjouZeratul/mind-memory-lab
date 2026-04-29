#include <node_api.h>
#include <stdint.h>
#include <string.h>

#include "mindmem.h"

static void u64_to_hex(uint64_t h, char out[17]) {
  static const char *xd = "0123456789abcdef";
  for (int i = 15; i >= 0; i--) {
    out[i] = xd[(int)(h & 15u)];
    h >>= 4;
  }
  out[16] = '\0';
}

static napi_value Fnv1a64(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  if (argc < 1) {
    napi_throw_type_error(env, NULL, "expected Buffer");
    return NULL;
  }
  void *data = NULL;
  size_t len = 0;
  napi_status st = napi_get_buffer_info(env, args[0], &data, &len);
  if (st != napi_ok || data == NULL) {
    napi_throw_type_error(env, NULL, "expected Buffer");
    return NULL;
  }
  uint64_t h = mind_fnv1a64((const unsigned char *)data, len);
  char hex[17];
  u64_to_hex(h, hex);
  napi_value out;
  napi_create_string_utf8(env, hex, 16, &out);
  return out;
}

static napi_value ChunkUtf8(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  if (argc < 2) {
    napi_throw_type_error(env, NULL, "expected (buffer, maxChunkBytes)");
    return NULL;
  }
  void *data = NULL;
  size_t len = 0;
  if (napi_get_buffer_info(env, args[0], &data, &len) != napi_ok || data == NULL) {
    napi_throw_type_error(env, NULL, "arg0 must be Buffer");
    return NULL;
  }
  uint32_t max_chunk = 4096;
  napi_get_value_uint32(env, args[1], &max_chunk);
  if (max_chunk < 64u) max_chunk = 64u;

  napi_value arr;
  napi_create_array(env, &arr);
  uint32_t idx = 0;
  size_t start = 0;
  const unsigned char *b = (const unsigned char *)data;
  while (start < len) {
    size_t end = mind_chunk_end(b, len, start, (size_t)max_chunk);
    if (end <= start) end = start + 1;
    napi_value chunk;
    napi_create_buffer_copy(env, end - start, b + start, &chunk);
    napi_set_element(env, arr, idx++, chunk);
    start = end;
  }
  return arr;
}

static napi_value TokenEstimate(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  void *data = NULL;
  size_t len = 0;
  if (argc < 1 || napi_get_buffer_info(env, args[0], &data, &len) != napi_ok || data == NULL) {
    napi_throw_type_error(env, NULL, "expected Buffer");
    return NULL;
  }
  size_t n = mind_whitespace_token_estimate((const unsigned char *)data, len);
  napi_value out;
  napi_create_double(env, (double)n, &out);
  return out;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor props[] = {
      {"fnv1a64Hex", NULL, Fnv1a64, NULL, NULL, NULL, napi_default, NULL},
      {"chunkUtf8Buffers", NULL, ChunkUtf8, NULL, NULL, NULL, napi_default, NULL},
      {"whitespaceTokenEstimate", NULL, TokenEstimate, NULL, NULL, NULL, napi_default, NULL},
  };
  napi_define_properties(env, exports, sizeof props / sizeof props[0], props);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
