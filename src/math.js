export function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
export function normalize(a) {
  const norm = Math.sqrt(dot(a, a));
  return a.map((v) => (norm ? v / norm : 0));
}
export function cosine(a, b) {
  if (a.length !== b.length || !a.length)
    throw new Error("Embedding dimensions do not match.");
  const divisor = Math.sqrt(dot(a, a) * dot(b, b));
  return divisor ? Math.max(-1, Math.min(1, dot(a, b) / divisor)) : 0;
}
export function rankSemantic(notes, embeddings, query) {
  return notes
    .map((note, i) => ({ note, index: i, score: cosine(embeddings[i], query) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
}
// Exact identifiers are navigation, not a learned similarity score. Require
// the whole query, and refuse ambiguous case-insensitive matches.
export function exactNoteIndex(notes, query) {
  const text = query.trim();
  const exact = notes.findIndex((note) => note.id === text);
  if (exact >= 0) return exact;
  const matches = notes.flatMap((note, index) =>
    note.id.toLowerCase() === text.toLowerCase() ? [index] : [],
  );
  return matches.length === 1 ? matches[0] : -1;
}
const stop = new Set(
  "a an and are as at be but by can do for from how i in is it of on or that the their them this to was we what when where which who will with without you your".split(
    " ",
  ),
);
export const terms = (text) => [
  ...new Set(
    (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(
      (t) => !stop.has(t),
    ),
  ),
];
export function rankKeywords(notes, query) {
  const q = terms(query);
  return notes
    .map((note, index) => {
      const words = new Set(terms(`${note.title} ${note.text}`));
      return {
        note,
        index,
        score: q.length ? q.filter((t) => words.has(t)).length / q.length : 0,
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
}
// Deterministic PCA on centered full embeddings. The Gram matrix keeps cost O(n²d).
export function project(embeddings) {
  const n = embeddings.length;
  if (!n) return [];
  if (n === 1) return [[0, 0]];
  const d = embeddings[0].length;
  const mean = Array(d).fill(0);
  for (const e of embeddings) for (let j = 0; j < d; j++) mean[j] += e[j] / n;
  const centered = embeddings.map((e) => e.map((v, j) => v - mean[j]));
  const gram = centered.map((a) => centered.map((b) => dot(a, b)));
  const axes = [];
  for (let axis = 0; axis < 2; axis++) {
    let v = normalize(
      Array.from(
        { length: n },
        (_, i) =>
          Math.sin((i + 1) * (axis + 1) * 1.618) + Math.cos((i + 1) * 0.733),
      ),
    );
    for (let k = 0; k < 100; k++) {
      let next = gram.map((row) => dot(row, v));
      for (const prev of axes) {
        const overlap = dot(next, prev.vector);
        next = next.map((x, i) => x - overlap * prev.vector[i]);
      }
      v = normalize(next);
    }
    const first = v.find((x) => Math.abs(x) > 1e-8);
    if (first < 0) v = v.map((x) => -x);
    const eigen = Math.max(
      0,
      dot(
        v,
        gram.map((row) => dot(row, v)),
      ),
    );
    axes.push({ vector: v, scale: Math.sqrt(eigen) });
  }
  const points = embeddings.map((_, i) =>
    axes.map((a) => a.vector[i] * a.scale),
  );
  const max = Math.max(0.001, ...points.flat().map(Math.abs));
  return points.map((p) => p.map((x) => x / max));
}
export function validateCollection(value) {
  if (
    !value ||
    value.version !== 1 ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > 80 ||
    !Array.isArray(value.notes) ||
    value.notes.length < 1 ||
    value.notes.length > 100
  )
    throw new Error("Use a version 1 collection with a title and 1–100 notes.");
  const ids = new Set();
  const notes = value.notes.map((n, i) => {
    if (
      !n ||
      typeof n.title !== "string" ||
      !n.title.trim() ||
      n.title.length > 100 ||
      typeof n.text !== "string" ||
      !n.text.trim() ||
      n.text.length > 1800 ||
      typeof n.group !== "string" ||
      !n.group.trim() ||
      n.group.length > 40
    )
      throw new Error(
        `Note ${i + 1}: provide a title (100 characters), text (1,800), and group (40).`,
      );
    const id =
      typeof n.id === "string" && /^[\w-]{1,64}$/.test(n.id)
        ? n.id
        : `import-${i + 1}`;
    if (ids.has(id)) throw new Error(`Note ${i + 1}: duplicate ID.`);
    ids.add(id);
    return {
      id,
      title: n.title.trim(),
      text: n.text.trim(),
      group: n.group.trim(),
    };
  });
  return {
    id: "imported",
    title: value.title.trim(),
    subtitle: "Your imported collection. Embeddings generated locally.",
    examples: [],
    notes,
  };
}
export function serializeCollection(collection) {
  return JSON.stringify(
    {
      version: 1,
      title: collection.title,
      notes: collection.notes.map(({ id, title, text, group }) => ({
        id,
        title,
        text,
        group,
      })),
    },
    null,
    2,
  );
}
