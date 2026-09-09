import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  normalize,
  cosine,
  rankSemantic,
  rankKeywords,
  exactNoteIndex,
  project,
  validateCollection,
  serializeCollection,
} from "../src/math.js";
import { collections } from "../src/data/collections.js";
import data from "../src/data/embeddings.json" with { type: "json" };
import { collections as expanded } from "../src/data/collections-v2.js";
import { SEED_PATH } from "../src/data/seed-path.js";
test("exact ID navigation trims whitespace, supports unambiguous case changes, and never matches substrings", () => {
  const notes = [{ id: "f26" }, { id: "ABC" }, { id: "abc" }];
  assert.equal(exactNoteIndex(notes, " f26 "), 0);
  assert.equal(exactNoteIndex(notes, "F26"), 0);
  assert.equal(exactNoteIndex(notes, "ABC"), 1);
  assert.equal(exactNoteIndex(notes, "abc"), 2);
  assert.equal(exactNoteIndex(notes, "Abc"), -1);
  assert.equal(exactNoteIndex(notes, "find f26 please"), -1);
  assert.equal(exactNoteIndex(notes, "f2"), -1);
  assert.equal(exactNoteIndex(notes, ""), -1);
});
test("cosine is normalized, signed, dimension-safe, and handles zero vectors", () => {
  assert.equal(cosine([2, 0], [100, 0]), 1);
  assert.equal(cosine([2, 0], [0, 9]), 0);
  assert.equal(cosine([2, 0], [-100, 0]), -1);
  assert.equal(cosine([0, 0], [1, 2]), 0);
  assert.throws(() => cosine([1], [1, 2]));
  assert.ok(Math.abs(Math.hypot(...normalize([3, 4])) - 1) < 1e-10);
});
test("semantic ranking uses vector distance and stable ties, keyword ranking uses actual overlap", () => {
  const notes = [
    { id: "a", title: "Feline nap", text: "A cat sleeps." },
    { id: "b", title: "Dog", text: "A dog runs." },
    { id: "c", title: "Other", text: "Empty" },
  ];
  const ranked = rankSemantic(
    notes,
    [
      [1, 0],
      [0, 1],
      [1, 0],
    ],
    [1, 0],
  );
  assert.deepEqual(
    ranked.map((r) => r.note.id),
    ["a", "c", "b"],
  );
  assert.equal(rankKeywords(notes, "A dog runs")[0].note.id, "b");
  assert.ok(
    rankKeywords(notes, "nothing matching").every((r) => r.score === 0),
  );
});
test("PCA is deterministic, bounded, finite, and centers identical vectors", () => {
  const embeddings = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0.7, 0.7, 0],
  ];
  const a = project(embeddings);
  assert.deepEqual(a, project(embeddings));
  assert.ok(a.flat().every((x) => Number.isFinite(x) && Math.abs(x) <= 1));
  assert.deepEqual(project([]), []);
  assert.deepEqual(project([[1, 1]]), [[0, 0]]);
  assert.ok(
    project([
      [1, 1],
      [1, 1],
    ])
      .flat()
      .every((x) => x === 0),
  );
});
test("real precomputed vectors are 384d normalized model output with matching deterministic PCA", () => {
  assert.equal(data.model, "Xenova/all-MiniLM-L6-v2");
  for (const c of collections) {
    const d = data.collections[c.id];
    assert.equal(c.notes.length, 40);
    assert.equal(d.embeddings.length, c.notes.length);
    for (const e of d.embeddings) {
      assert.equal(e.length, 384);
      assert.ok(Math.abs(cosine(e, e) - 1) < 1e-6);
      assert.ok(Math.abs(Math.hypot(...e) - 1) < 1e-5);
    }
    assert.deepEqual(project(d.embeddings), d.points);
    const ranking = rankSemantic(c.notes, d.embeddings, d.embeddings[0]);
    assert.equal(ranking[0].note.id, c.notes[0].id);
  }
});
test("expanded seed preserves 120 real vectors, stable PCA, cache integrity and the frozen evaluation corpus", async () => {
  const read = (path) => readFile(new URL(`../${path}`, import.meta.url));
  const bytes = await read(`public/${SEED_PATH}`);
  const seed = JSON.parse(bytes);
  const report = JSON.parse(await read("evaluation/expanded-results.json"));
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    report.seed.sha256,
  );
  assert.equal(seed.model, data.model);
  for (const c of expanded) {
    const d = seed.collections[c.id];
    assert.equal(c.notes.length, 60);
    assert.deepEqual(d.collection, c);
    assert.deepEqual(
      c.notes.slice(0, 40),
      collections.find((old) => old.id === c.id).notes,
    );
    assert.equal(d.embeddings.length, 60);
    assert.deepEqual(project(d.embeddings), d.points);
    for (const v of [...d.embeddings, ...Object.values(d.examples)]) {
      assert.equal(v.length, 384);
      assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-5);
    }
    assert.equal(
      rankSemantic(c.notes, d.embeddings, d.embeddings[59])[0].note.id,
      c.notes[59].id,
    );
  }
  const frozen = JSON.parse(await read("evaluation/preregistration-v2.json"));
  for (const [file, hash] of Object.entries({
    ...frozen.hashes,
    ...report.sourceHashes,
  })) {
    assert.equal(
      createHash("sha256")
        .update(await read(file))
        .digest("hex"),
      hash,
      `${file} must still match its evaluation`,
    );
  }
  assert.equal(report.queries.length, 24);
  assert.equal(
    report.queries.filter((q) => q.rank === 1).length,
    report.hitAt1,
  );
  assert.equal(
    report.queries.filter((q) => q.rank > 0 && q.rank <= 3).length,
    report.hitAt3,
  );
});
test("import validates schema, limits, duplicates and round trips portable text", () => {
  const valid = JSON.parse(serializeCollection(collections[0]));
  assert.equal(validateCollection(valid).notes.length, 40);
  for (const bad of [
    null,
    {},
    { ...valid, version: 2 },
    { ...valid, title: "" },
    { ...valid, notes: [] },
    { ...valid, notes: Array(101).fill(valid.notes[0]) },
    { ...valid, notes: [valid.notes[0], valid.notes[0]] },
    { ...valid, notes: [{ ...valid.notes[0], text: "x".repeat(1801) }] },
    { ...valid, notes: [{ ...valid.notes[0], group: {} }] },
  ])
    assert.throws(() => validateCollection(bad));
  const literal = {
    version: 1,
    title: "<img src=x>",
    notes: [
      {
        id: "bad<script>",
        title: "<script>alert(1)</script>",
        text: "Safe plain text",
        group: "Mine",
        embedding: [999],
      },
    ],
  };
  const n = validateCollection(literal).notes[0];
  assert.equal(n.id, "import-1");
  assert.equal(n.title, "<script>alert(1)</script>");
  assert.equal(n.embedding, undefined);
});
