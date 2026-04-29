{
  "targets": [
    {
      "target_name": "mindmem_native",
      "sources": [
        "src/napi.c",
        "../../c/src/chunk.c",
        "../../c/src/fnv.c"
      ],
      "include_dirs": ["../../c/include"],
      "defines": ["NAPI_VERSION=9"]
    }
  ]
}
