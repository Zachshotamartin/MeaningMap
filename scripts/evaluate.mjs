import { pipeline, env } from "@huggingface/transformers";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collections, MODEL } from "../src/data/collections.js";
import data from "../src/data/embeddings.json" with { type: "json" };
import { rankSemantic, rankKeywords } from "../src/math.js";
// Human-labeled retrieval probes written before running evaluation; excluded from preset examples.
export const probes = [
  {
    collection: "field-notes",
    query: "I want to escape the hot sun on my afternoon walk.",
    relevant: ["f01", "f04"],
  },
  {
    collection: "field-notes",
    query: "Can I fix a broken toaster with help from my neighbors?",
    relevant: ["f10"],
  },
  {
    collection: "field-notes",
    query: "Keep a hard disk failure from wiping out my pictures.",
    relevant: ["f26", "f25", "f32"],
  },
  {
    collection: "field-notes",
    query: "Give insects food after the spring blossoms fade.",
    relevant: ["f38"],
  },
  {
    collection: "field-notes",
    query: "A flood should soak into the ground instead of overloading pipes.",
    relevant: ["f03", "f05"],
  },
  {
    collection: "field-notes",
    query: "Too many pings make it impossible to concentrate.",
    relevant: ["f17", "f23"],
  },
  {
    collection: "field-notes",
    query: "Mend my favorite coat instead of throwing it away.",
    relevant: ["f28"],
  },
  {
    collection: "field-notes",
    query: "I need a power tool for just one weekend.",
    relevant: ["f09"],
  },
  {
    collection: "studio-notebook",
    query:
      "Someone pressed the wrong control and wants their previous work back.",
    relevant: ["s02", "s08"],
  },
  {
    collection: "studio-notebook",
    query: "How can a blind visitor understand the page?",
    relevant: ["s09"],
  },
  {
    collection: "studio-notebook",
    query:
      "The newest response should replace the earlier search, even if it finishes first.",
    relevant: ["s34"],
  },
  {
    collection: "studio-notebook",
    query:
      "People click a lot because they are lost. Are we measuring success wrong?",
    relevant: ["s17", "s22"],
  },
  {
    collection: "studio-notebook",
    query: "Let people move their data into a different app.",
    relevant: ["s36"],
  },
  {
    collection: "studio-notebook",
    query: "The spinning animation makes me dizzy.",
    relevant: ["s12", "s31"],
  },
  {
    collection: "studio-notebook",
    query: "A long calculation makes all of the buttons freeze.",
    relevant: ["s35"],
  },
  {
    collection: "studio-notebook",
    query: "Try an idea privately before making it visible to everyone.",
    relevant: ["s05", "s01"],
  },
];
env.allowRemoteModels = false;
env.localModelPath =
  resolve("public/models/751bff37182d3f1213fa05d7196b954e230abad9") + "/";
const embed = await pipeline("feature-extraction", MODEL, {
  dtype: "q8",
  device: "cpu",
});
const rows = [];
for (const p of probes) {
  const c = collections.find((c) => c.id === p.collection);
  const vector = (
    await embed(p.query, { pooling: "mean", normalize: true })
  ).tolist()[0];
  const semantic = rankSemantic(
    c.notes,
    data.collections[c.id].embeddings,
    vector,
  );
  const keyword = rankKeywords(c.notes, p.query);
  const first = (r) => r.findIndex((x) => p.relevant.includes(x.note.id)) + 1;
  const sr = first(semantic),
    kr = first(keyword);
  rows.push({
    ...p,
    semanticRank: sr,
    keywordRank: kr,
    semanticTop3: semantic
      .slice(0, 3)
      .map((x) => ({ id: x.note.id, title: x.note.title, cosine: x.score })),
    keywordTop3: keyword
      .slice(0, 3)
      .map((x) => ({ id: x.note.id, title: x.note.title, overlap: x.score })),
  });
}
const metrics = (key) => ({
  hitAt1: rows.filter((r) => r[key] === 1).length / rows.length,
  hitAt3: rows.filter((r) => r[key] <= 3).length / rows.length,
  MRR: rows.reduce((s, r) => s + 1 / r[key], 0) / rows.length,
});
const report = {
  model: MODEL,
  revision: data.revision,
  dtype: "q8",
  count: rows.length,
  notes:
    "Small authored diagnostic set, held out from example queries. Not a general-purpose model benchmark or evidence of training.",
  semantic: metrics("semanticRank"),
  keyword: metrics("keywordRank"),
  probes: rows,
};
await writeFile(
  "examples/retrieval-evaluation.json",
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify(
    { count: report.count, semantic: report.semantic, keyword: report.keyword },
    null,
    2,
  ),
);
await embed.dispose();
