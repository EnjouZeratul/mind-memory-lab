/** TypeScript 版 FNV-1a 64，与 `c/src/fnv.c` 语义对齐（测试对照用）。 */
export function fnv1a64(data: Uint8Array): bigint {
  let h = 14695981039346656037n;
  const prime = 1099511628211n;
  for (let i = 0; i < data.length; i++) {
    h ^= BigInt(data[i]!);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h;
}

export function fnv1a64Hex(data: Uint8Array): string {
  const h = fnv1a64(data);
  return h.toString(16).padStart(16, "0");
}
