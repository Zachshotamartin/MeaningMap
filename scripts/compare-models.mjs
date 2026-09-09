import { pipeline, env } from "@huggingface/transformers";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { collections, textForNote } from "../src/data/collections.js";
import { rankSemantic, rankKeywords, exactNoteIndex } from "../src/math.js";
import { probes } from "../evaluation/probes-v2.js";
const specs = [
  {
    id: "minilm",
    model: "Xenova/all-MiniLM-L6-v2",
    revision: "751bff37182d3f1213fa05d7196b954e230abad9",
    pooling: "mean",
    prefix: "",
    directory: "public/models/751bff37182d3f1213fa05d7196b954e230abad9",
  },
  {
    id: "bge-small",
    model: "Xenova/bge-small-en-v1.5",
    revision: "ea104dacec62c0de699686887e3f920caeb4f3e3",
    pooling: "cls",
    prefix: "Represent this sentence for searching relevant passages: ",
    directory:
      ".cache/comparison-models/ea104dacec62c0de699686887e3f920caeb4f3e3",
  },
];
specs.push({
  id: "e5-small",
  model: "Xenova/e5-small-v2",
  revision: "02af79985278377e65c724a76275707cb0333c70",
  pooling: "mean",
  prefix: "query: ",
  passagePrefix: "passage: ",
  directory:
    ".cache/comparison-models/02af79985278377e65c724a76275707cb0333c70",
});
await mkdir(".cache", { recursive: true });
const prereg = JSON.parse(
  await readFile("evaluation/preregistration-v2.json", "utf8"),
);
for (const [file, hash] of Object.entries(prereg.hashes)) {
  const actual = createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
  if (actual !== hash) throw Error(`Frozen benchmark input changed: ${file}`);
}
const report = {
  version: 2,
  queryCount: probes.length,
  corpusNotes: collections.reduce((s, c) => s + c.notes.length, 0),
  preregisteredHashes: prereg.hashes,
  notes:
    "Authored, frozen diagnostic, not a general independent benchmark. No weights trained or labels revised. Out-of-scope cases have no relevant notes and are excluded from Hit@k.",
  models: [],
};
const firstRank = (ranked, relevant) => {
  const i = ranked.findIndex((x) => relevant.includes(x.note.id));
  return i < 0 ? null : i + 1;
};
const metrics = (rows) => ({
  count: rows.length,
  hitAt1: rows.filter((r) => r.rank === 1).length / rows.length,
  hitAt3:
    rows.filter((r) => r.rank !== null && r.rank <= 3).length / rows.length,
  MRR: rows.reduce((s, r) => s + (r.rank ? 1 / r.rank : 0), 0) / rows.length,
});
for (const spec of specs) {
  const files = [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "onnx/model_quantized.onnx",
  ];
  const manifest = [];
  for (const file of files) {
    const dest = resolve(spec.directory, spec.model, file);
    await mkdir(dirname(dest), { recursive: true });
    try {
      await stat(dest);
    } catch {
      const response = await fetch(
        `https://huggingface.co/${spec.model}/resolve/${spec.revision}/${file}`,
      );
      if (!response.ok) throw Error(`${file}: ${response.status}`);
      await writeFile(dest, Buffer.from(await response.arrayBuffer()));
    }
    const bytes = await readFile(dest);
    manifest.push({
      file,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  console.log(`Encoding corpus with ${spec.id}…`);
  env.allowRemoteModels = false;
  env.localModelPath = resolve(spec.directory) + "/";
  const before = performance.now();
  const extractor = await pipeline("feature-extraction", spec.model, {
    dtype: "q8",
    device: "cpu",
  });
  const loadMs = performance.now() - before;
  const encode = async (text) =>
    (
      await extractor(text, { pooling: spec.pooling, normalize: true })
    ).tolist()[0];
  const embeddings = {};
  for (const c of collections) {
    embeddings[c.id] = [];
    for (const n of c.notes)
      embeddings[c.id].push(
        await encode((spec.passagePrefix || "") + textForNote(n)),
      );
  }
  const rows = [];
  for (const probe of probes) {
    const c = collections.find((c) => c.id === probe.collection);
    const started = performance.now();
    const vector = await encode(spec.prefix + probe.query);
    const latencyMs = performance.now() - started;
    const ranking = rankSemantic(c.notes, embeddings[c.id], vector);
    const exact = c.notes[exactNoteIndex(c.notes, probe.query)];
    const idAware = exact
      ? [{ note: exact }, ...ranking.filter((r) => r.note.id !== exact.id)]
      : ranking;
    // Zero-overlap notes are not literal results in the application.
    const keywords = rankKeywords(c.notes, probe.query).filter(
      (r) => r.score > 0,
    );
    rows.push({
      ...probe,
      rank: firstRank(ranking, probe.relevant),
      idAwareRank: firstRank(idAware, probe.relevant),
      keywordRank: firstRank(keywords, probe.relevant),
      latencyMs,
      top3: ranking
        .slice(0, 3)
        .map((r) => ({ id: r.note.id, title: r.note.title, score: r.score })),
      keywordTop3: keywords
        .slice(0, 3)
        .map((r) => ({ id: r.note.id, title: r.note.title, score: r.score })),
    });
  }
  const answerable = rows.filter((r) => r.relevant.length);
  const out = rows.filter((r) => !r.relevant.length);
  const sorted = rows.map((r) => r.latencyMs).sort((a, b) => a - b);
  const result = {
    ...spec,
    dtype: "q8",
    manifest,
    loadMs,
    nodeWarmLatency: {
      medianMs: sorted[Math.floor(sorted.length / 2)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    },
    answerable: metrics(answerable),
    paraphrase: metrics(
      rows.filter((r) => ["synonym", "paraphrase"].includes(r.category)),
    ),
    exact: metrics(rows.filter((r) => r.category.startsWith("exact"))),
    withExactIdRouting: metrics(
      answerable.map((r) => ({ ...r, rank: r.idAwareRank })),
    ),
    keyword: metrics(answerable.map((r) => ({ ...r, rank: r.keywordRank }))),
    outOfScope: {
      count: out.length,
      topScoreMin: Math.min(...out.map((r) => r.top3[0].score)),
      topScoreMax: Math.max(...out.map((r) => r.top3[0].score)),
      answerableTopScoreMin: Math.min(
        ...answerable.map((r) => r.top3[0].score),
      ),
    },
    queries: rows,
  };
  report.models.push(result);
  await writeFile(
    `.cache/${spec.id}-embeddings.json`,
    JSON.stringify(embeddings),
  );
  console.log(
    JSON.stringify(
      {
        model: spec.model,
        bytes: manifest.reduce((s, f) => s + f.bytes, 0),
        answerable: result.answerable,
        paraphrase: result.paraphrase,
        withExactIdRouting: result.withExactIdRouting,
        latency: result.nodeWarmLatency,
        outOfScope: result.outOfScope,
      },
      null,
      2,
    ),
  );
  await extractor.dispose();
}
await writeFile(
  "evaluation/model-comparison-v2.json",
  JSON.stringify(report, null, 2),
);
