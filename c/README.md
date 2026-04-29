# c — 与宿主解耦的原语库

本目录以 **C99** 提供可被多种宿主（Node、未来自研语言运行时、本地工具链）链接或绑定的算法原语。

## 构建（可选）

使用已安装的 C 编译器生成静态库（示例，按平台调整）：

```bash
# POSIX
cc -std=c99 -O2 -I include -c src/fnv.c src/chunk.c
ar rcs libmindmem.a fnv.o chunk.o
```

Windows 可使用 `cl` 或 `clang-cl` 生成 `.obj` 后 `lib /out:libmindmem.lib ...`。

Node 侧可选绑定见 `packages/native-mindmem`（`node-gyp rebuild`）。

## ABI 稳定性

对外语义以 `include/mindmem.h` 为准；实现变更应保持函数名与契约不变，或在文档中显式标注版本。
