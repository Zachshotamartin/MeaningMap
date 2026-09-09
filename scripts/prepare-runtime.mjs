import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const ort = "onnx-1.22.0-dev-89f8206ba4";
await mkdir(`public/runtime/${ort}`, { recursive: true });
const assets = [
  [
    "node_modules/@huggingface/transformers/dist/transformers.min.js",
    "public/runtime/transformers-3.8.1.min.js",
  ],
  [
    "node_modules/@huggingface/transformers/LICENSE",
    "public/runtime/TRANSFORMERS-LICENSE",
  ],
  ...["mjs", "wasm"].map((ext) => [
    `node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.${ext}`,
    `public/runtime/${ort}/ort-wasm-simd-threaded.${ext}`,
  ]),
];
const files = [];
for (const [from, to] of assets) {
  await copyFile(from, to);
  const data = await readFile(to);
  files.push({
    file: to.replace("public/", ""),
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
await writeFile(
  "public/runtime/MANIFEST.json",
  JSON.stringify(
    { transformers: "3.8.1", onnx: "1.22.0-dev.20250409-89f8206ba4", files },
    null,
    2,
  ),
);
