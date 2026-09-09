import { pipeline, env } from "@huggingface/transformers";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collections, MODEL, textForNote } from "../src/data/collections.js";
import { project } from "../src/math.js";
env.allowRemoteModels = false;
env.localModelPath =
  resolve("public/models/751bff37182d3f1213fa05d7196b954e230abad9") + "/";
env.cacheDir = resolve(".cache");
const extractor = await pipeline("feature-extraction", MODEL, {
  dtype: "q8",
  device: "cpu",
});
const compact = (vector) => vector.map((v) => Number(v.toFixed(7)));
const result = {
  model: MODEL,
  revision: "751bff37182d3f1213fa05d7196b954e230abad9",
  dtype: "q8",
  pooling: "mean",
  normalize: true,
  dimensions: 384,
  collections: {},
};
for (const c of collections) {
  const embeddings = [];
  for (const n of c.notes) {
    embeddings.push(
      compact(
        (
          await extractor(textForNote(n), { pooling: "mean", normalize: true })
        ).tolist()[0],
      ),
    );
  }
  const examples = {};
  for (const q of c.examples)
    examples[q] = compact(
      (await extractor(q, { pooling: "mean", normalize: true })).tolist()[0],
    );
  result.collections[c.id] = {
    embeddings,
    points: project(embeddings),
    examples,
  };
  console.log(
    `Embedded ${c.title}: ${embeddings.length} notes + ${c.examples.length} examples.`,
  );
}
await writeFile("src/data/embeddings.json", JSON.stringify(result));
await extractor.dispose();
