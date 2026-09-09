import { pipeline, env } from "@huggingface/transformers";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { collections } from "../src/data/collections-v2.js";
import { MODEL, textForNote } from "../src/data/collections.js";
import { project, rankSemantic, rankKeywords } from "../src/math.js";
import { probes } from "../evaluation/expanded-probes.js";
const revision = "751bff37182d3f1213fa05d7196b954e230abad9";
const sourceHashes = {};
for (const file of [
  "src/data/collections-v2.js",
  "evaluation/expanded-probes.js",
])
  sourceHashes[file] = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
env.allowRemoteModels = false;
env.localModelPath = resolve("public/models/" + revision) + "/";
const encoder = await pipeline("feature-extraction", MODEL, {
  dtype: "q8",
  device: "cpu",
});
const encode = async (text) =>
  (await encoder(text, { pooling: "mean", normalize: true }))
    .tolist()[0]
    .map((v) => Number(v.toFixed(7)));
const seed = { version: 2, model: MODEL, dimensions: 384, collections: {} };
for (const c of collections) {
  console.log("Embedding", c.title, c.notes.length, "notes");
  const embeddings = [];
  for (const n of c.notes) embeddings.push(await encode(textForNote(n)));
  const examples = {};
  for (const q of c.examples) examples[q] = await encode(q);
  seed.collections[c.id] = {
    collection: c,
    embeddings,
    points: project(embeddings),
    examples,
  };
}
await mkdir("public/data", { recursive: true });
const json = JSON.stringify(seed),
  hash = createHash("sha256").update(json).digest("hex"),
  filename = `meaning-notes-v2-${hash.slice(0, 12)}.json`;
await writeFile("public/data/" + filename, json);
await writeFile(
  "src/data/seed-path.js",
  `export const SEED_PATH = ${JSON.stringify("data/" + filename)};\n`,
);
const rows = [];
for (const q of probes) {
  const d = seed.collections[q.collection],
    vector = await encode(q.query);
  const ranked = rankSemantic(d.collection.notes, d.embeddings, vector),
    literal = rankKeywords(d.collection.notes, q.query).filter(
      (r) => r.score > 0,
    );
  const position = ranked.findIndex((r) => q.relevant.includes(r.note.id));
  rows.push({
    ...q,
    rank: position < 0 ? null : position + 1,
    top3: ranked
      .slice(0, 3)
      .map((r) => ({ id: r.note.id, title: r.note.title, score: r.score })),
    keywordTop3: literal
      .slice(0, 3)
      .map((r) => ({ id: r.note.id, title: r.note.title, score: r.score })),
  });
}
const report = {
  version: 1,
  scope:
    "Separate authored diagnostic for the 120-note expanded corpus. Distinct from the frozen 80-note model comparison.",
  model: MODEL,
  revision,
  sourceHashes,
  queries: rows,
  hitAt1: rows.filter((r) => r.rank === 1).length,
  hitAt3: rows.filter((r) => r.rank !== null && r.rank <= 3).length,
  count: rows.length,
  seed: { file: filename, sha256: hash, bytes: Buffer.byteLength(json) },
};
await writeFile(
  "evaluation/expanded-results.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    seed: report.seed,
    hitAt1: report.hitAt1,
    hitAt3: report.hitAt3,
    count: report.count,
  }),
);
await encoder.dispose();
