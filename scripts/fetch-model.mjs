import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const revision = "751bff37182d3f1213fa05d7196b954e230abad9";
const files = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/model_quantized.onnx",
];
await mkdir(
  "public/models/751bff37182d3f1213fa05d7196b954e230abad9/Xenova/all-MiniLM-L6-v2/onnx",
  { recursive: true },
);
const manifest = await Promise.all(
  files.map(async (file) => {
    const url = `https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/${revision}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw Error(`${file}: ${res.status}`);
    const data = Buffer.from(await res.arrayBuffer());
    await writeFile(
      `public/models/751bff37182d3f1213fa05d7196b954e230abad9/Xenova/all-MiniLM-L6-v2/${file}`,
      data,
    );
    console.log(file, data.length);
    return {
      file,
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
      url,
    };
  }),
);
await writeFile(
  "public/models/MANIFEST.json",
  JSON.stringify(
    {
      model: "Xenova/all-MiniLM-L6-v2",
      revision,
      license: "Apache-2.0",
      files: manifest,
    },
    null,
    2,
  ),
);
