import { collections, MODEL, textForNote } from "./data/collections.js";
import precomputed from "./data/embeddings.json";
import {
  rankSemantic,
  rankKeywords,
  exactNoteIndex,
  terms,
  cosine,
  validateCollection,
  serializeCollection,
} from "./math.js";

export const metadata = {
  id: "meaning-map",
  title: "Meaning Map",
  description:
    "A notebook you can search by meaning. Explore real sentence embeddings, compare literal matches, and add your own ideas.",
  instructions: [
    "Choose a collection, try an example, or search in your own words.",
    "Read the saved text and compare semantic results with literal word matches for the same query.",
    "Open Explore the note map for a spatial view. Use arrow keys between notes; Fit map restores the overview.",
    "Add or import notes in Your collection, then export to keep your work.",
  ],
  limitations: [
    "English sentence embeddings can miss nuance and reflect training bias. Cosine similarity is not confidence.",
    "The PCA map compresses 384 dimensions into two. Visual distance is approximate; ranking uses full embeddings.",
    "Fresh text loads a 23 MB pretrained model and 11 MB runtime on demand, then runs locally. No note text is transmitted.",
    "Collections hold up to 100 notes. Notes are limited to 1,800 characters; the model truncates at 512 tokens. Export your work before closing the tab.",
  ],
  technique:
    "Pretrained MiniLM sentence encoder · quantized ONNX · cosine retrieval · deterministic PCA",
};
const palette = [
  "#b8cd99",
  "#d99976",
  "#d9c394",
  "#a0c1bf",
  "#c7b5a2",
  "#b4bba9",
];
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
let mounts = 0;
export function mountExperiment(element, options = {}) {
  const uid = `mm-${++mounts}`;
  const root = el("section", "meaning-map");
  root.setAttribute("aria-label", "Meaning Map experiment");
  root.innerHTML = `<header class="mm-header"><div><p class="mm-eyebrow">A SEMANTIC NOTEBOOK / EXPERIMENT 02</p><h2>Meaning Map<span aria-hidden="true"> ↗</span></h2><p class="mm-intro">Find the thought, even when the words are different.</p></div><div class="mm-model"><span class="mm-model-dot"></span><span>MiniLM · 384 dimensions<br><small>Pretrained model · local inference</small></span></div></header>
 <section class="mm-guide" aria-label="How to read Meaning Map"><p class="mm-guide-intro"><strong>Explore notes by meaning.</strong> An idea about cooling buildings can lead to “The white roof,” a note about reflective roofs. Try an example, then describe an idea in your own words. The model is pretrained; adding notes needs no retraining.</p><div class="mm-guide-key"><p><strong>Read the map.</strong> Each dot is a note. Colors are author-assigned groups. Lines connect the selected note to its closest matches (up to three) in the full 384-dimensional space. Distances on this 2D map are approximate.</p><p><strong>Compare the search.</strong> Semantic compares meaning; Keyword compares shared words. Similarity scores describe how closely ideas match, not a probability that an answer is correct.</p></div><details class="mm-guide-details"><summary>The model, the 80 sample notes, and the quality check</summary><div><p><strong>The encoder is already trained.</strong> We use the pretrained MiniLM sentence model. Its creators fine-tuned it using a dataset of more than one billion sentence pairs. The 80 notes in our two sample collections are the things you search, not the data used to train the encoder. <a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2#background" target="_blank" rel="noreferrer">Read the official model card</a>.</p><p><strong>Adding a note needs no retraining.</strong> The model turns its text into 384 numbers, called an embedding, locally in your browser. Your query goes through the same model; search compares these full vectors. Colors come from the notes’ authored group labels, not AI-generated clusters.</p><p><strong>A small check, not a guarantee.</strong> We froze 64 new test queries before comparing three compact encoders. MiniLM found a relevant note first in <strong>37/44</strong> paraphrase and synonym cases, and within the first three in <strong>42/44</strong>. BGE-small tied those results; E5-small matched the first-result score but missed more top-three results. We kept the smaller MiniLM download. This is an authored diagnostic, not an independent benchmark or a guarantee. Four exact note IDs are handled by direct lookup, separately from semantic search. Twelve unrelated queries were also tested: similarity search still returns nearby notes, so results are suggestions from this collection, not answers to every question.</p></div></details></section>
 <div class="mm-searchbar"><label class="mm-collection-label">Collection<select data-ui="collection"></select></label><form class="mm-query-form"><label for="${uid}-query">Search an idea</label><div class="mm-query-row"><input id="${uid}-query" data-ui="query" maxlength="600" autocomplete="off" placeholder="Describe what you are looking for…" required><button class="mm-primary" type="submit">Find connections</button></div></form></div>
 <div class="mm-example-row"><span class="mm-small">Try a thought</span><div data-ui="examples" class="mm-examples"></div></div>
 <div class="mm-workspace"><div class="mm-map-column"><div class="mm-map-panel"><div class="mm-map-heading"><div><h3>Semantic landscape</h3><span data-ui="map-count" class="mm-small"></span></div><div class="mm-map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="fit">Fit map</button></div></div><div data-ui="map" class="mm-map" tabindex="0" role="group" aria-label="Note map. Select a note with Tab, navigate notes with arrow keys. When the map has focus, arrows pan and plus or minus zoom."><svg class="mm-edges" aria-hidden="true"></svg><div data-ui="nodes" class="mm-nodes"></div><div data-ui="labels" class="mm-labels" aria-hidden="true"></div><div class="mm-map-caption">NEARBY IDEAS, DIFFERENT WORDS</div></div><div data-ui="legend" class="mm-legend"></div><p class="mm-map-footnote">2D PCA projection · distances are approximate. Rankings use all 384 dimensions.</p></div><article data-ui="detail" class="mm-detail" aria-label="Selected note"></article></div>
 <aside class="mm-results"><div class="mm-results-header"><h3>Closest thoughts</h3><span data-ui="result-count" class="mm-small"></span></div><div class="mm-tabs" role="group" aria-label="Ranking method"><button data-mode="semantic" aria-pressed="true">Semantic</button><button data-mode="keyword" aria-pressed="false">Keyword</button></div><p data-ui="ranking-info" class="mm-ranking-info"></p><ol data-ui="results" class="mm-result-list"></ol><p class="mm-score-note">Cosine similarity is a relationship between vectors, not a probability or a factual judgment.</p></aside></div>
 <div class="mm-statusbar"><p data-ui="status" role="status" aria-live="polite">Examples are ready. Fresh text loads the model only when you need it.</p><progress data-ui="progress" max="100" value="0" hidden aria-label="Model loading progress"></progress><button data-action="cancel" hidden>Cancel</button><button data-action="retry" hidden>Retry</button><button data-action="load">Load local model</button></div>
 <div class="mm-inference-stats" aria-label="Local inference statistics"><dl><div><dt>Model</dt><dd data-ui="model-state">Not loaded</dd></div><div><dt>Completed requests</dt><dd data-ui="request-count">0</dd></div><div><dt>Notes embedded</dt><dd data-ui="note-count">0</dd></div><div><dt>Last fresh query</dt><dd data-ui="query-time">Not run yet</dd></div></dl><p>This visit only. Requests include queries and note batches. Query time includes loading when needed. Pretrained encoder; no training.</p></div>
 <details class="mm-collection-editor"><summary>Your collection <span class="mm-small">Add notes, import, or take a copy</span></summary><div class="mm-editor-body"><form class="mm-add-form"><h3>Add a thought</h3><label>Title<input name="title" required maxlength="100" placeholder="A short, useful title"></label><label>Note<textarea name="text" required maxlength="1800" rows="3" placeholder="Paste a thought or a paragraph. It stays in this browser tab."></textarea></label><label>Group<input name="group" maxlength="40" value="My notes" required></label><button class="mm-primary" type="submit">Embed & add note</button></form><div class="mm-file-tools"><h3>Make it yours</h3><p>Up to 100 notes per collection. Added notes stay in this tab until you export them.</p><button data-action="export">Export collection (.json)</button><label class="mm-file-label">Import collection<input data-ui="import" type="file" accept="application/json,.json"></label><button data-action="reset">Reset to preset</button><p class="mm-small">Import validates the text and regenerates every embedding with the same model. Existing notes are replaced only after success.</p></div></div></details>
 <footer class="mm-footer">Original notes + real pretrained embeddings. <a href="https://huggingface.co/Xenova/all-MiniLM-L6-v2" target="_blank" rel="noreferrer">MiniLM model · Apache 2.0</a><span>No server inference. No API key.</span></footer>`;
  if (options.embedded) {
    root.classList.add("mm-embedded");
    root.querySelector(".mm-header").remove();
  }
  // Search is the primary task. Keep the spatial view and background reading
  // available without placing them ahead of the note the visitor is seeking.
  const guide = root.querySelector(".mm-guide");
  guide.querySelector(".mm-guide-intro").textContent =
    "Find a saved note from an idea you remember. For example, searching for cooler buildings can find a note about reflective roofs. Results show the original text, so you can judge the connection.";
  const guideDetails = guide.querySelector(".mm-guide-details");
  guideDetails.querySelector("summary").textContent =
    "How semantic search works, and what we tested";
  guideDetails
    .querySelector("div")
    .prepend(guide.querySelector(".mm-guide-key"));
  root.insertBefore(guideDetails, root.querySelector(".mm-footer"));
  const mapSection = el("details", "mm-map-section");
  mapSection.innerHTML =
    '<summary>Explore the note map <span class="mm-small">Optional spatial overview</span></summary>';
  mapSection.append(root.querySelector(".mm-map-panel"));
  root.querySelector(".mm-workspace").after(mapSection);
  root.insertBefore(
    root.querySelector(".mm-statusbar"),
    root.querySelector(".mm-workspace"),
  );
  const comparison = el("section", "mm-comparison");
  comparison.setAttribute(
    "aria-label",
    "Compare search methods for the same query",
  );
  comparison.innerHTML =
    '<h3 data-ui="comparison-heading">Literal word matches</h3><p data-ui="comparison-query" class="mm-small"></p><ol data-ui="comparison-results"></ol><p data-ui="comparison-note" class="mm-small"></p>';
  root.querySelector(".mm-map-column").append(comparison);
  const scope = el("div", "mm-scope");
  scope.innerHTML =
    '<p data-ui="scope" class="mm-small"></p><button data-action="your-notes">Use your own notes</button>';
  root.querySelector(".mm-searchbar").after(scope);
  const corpus = el("details", "mm-corpus");
  corpus.innerHTML =
    '<summary data-ui="browse-label">Browse this collection</summary><p data-ui="corpus-description" class="mm-small"></p><div data-ui="corpus-notes" class="mm-corpus-notes"></div>';
  root.querySelector(".mm-example-row").after(corpus);
  const queryHeading = el("p", "mm-query-heading");
  queryHeading.dataset.ui = "query-heading";
  root.querySelector(".mm-workspace").before(queryHeading);
  root.querySelector(".mm-results-header h3").textContent = "Matching notes";
  element.append(root);
  const $ = (name) => root.querySelector(`[data-ui="${name}"]`);
  const act = (name) => root.querySelector(`[data-action="${name}"]`);
  const collectionSelect = $("collection"),
    queryInput = $("query"),
    map = $("map");
  for (const c of collections) {
    const o = el("option", "", c.title);
    o.value = c.id;
    collectionSelect.append(o);
  }
  let collection,
    embeddings,
    points,
    queryVector,
    query = "",
    selected = 0,
    selectionIsExplicit = false,
    mode = "semantic",
    ranking = [],
    zoom = 1,
    pan = [0, 0],
    worker = null,
    sequence = 0,
    operation = 0,
    pending = null,
    busy = false,
    loaded = false,
    disposed = false,
    retry = null,
    drag = null;
  const inference = {
    modelState: "Not loaded",
    completedRequests: 0,
    notesEmbedded: 0,
    lastQueryMs: null,
  };
  function renderInferenceStats() {
    $("model-state").textContent = inference.modelState;
    $("request-count").textContent = String(inference.completedRequests);
    $("note-count").textContent = String(inference.notesEmbedded);
    $("query-time").textContent =
      inference.lastQueryMs === null
        ? "Not run yet"
        : inference.lastQueryMs < 1000
          ? `${Math.max(1, Math.round(inference.lastQueryMs))} ms`
          : `${(inference.lastQueryMs / 1000).toFixed(2)} s`;
  }
  const cleanups = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const assetBase = new URL(
    options.assetBase || "./",
    document.baseURI,
  ).href.replace(/\/?$/, "/");
  const status = (message, error = false) => {
    $("status").textContent = message;
    $("status").classList.toggle("mm-error", error);
  };
  function busyState(value) {
    busy = value;
    act("cancel").hidden = !value;
    $("progress").hidden = !value;
    root.querySelector(".mm-query-form button").disabled = value;
    root.querySelector(".mm-add-form button").disabled = value;
    collectionSelect.disabled = value;
    act("load").hidden = value || loaded;
  }
  function cancel(
    message = "Cancelled. Your collection is unchanged.",
    invalidate = true,
  ) {
    if (invalidate) operation++;
    sequence++;
    worker?.terminate();
    worker = null;
    loaded = false;
    inference.modelState = "Not loaded";
    renderInferenceStats();
    if (pending) {
      pending.reject(new Error("cancelled"));
      pending = null;
    }
    busyState(false);
    $("progress").value = 0;
    status(message);
  }
  function run(type, texts = [], purpose = "notes") {
    if (disposed) return Promise.reject(new Error("cancelled"));
    if (busy) cancel(undefined, false);
    const id = ++sequence;
    busyState(true);
    inference.modelState = loaded ? "Ready" : "Loading";
    renderInferenceStats();
    act("retry").hidden = true;
    $("progress").removeAttribute("value");
    status(
      loaded
        ? "Computing sentence embeddings locally…"
        : "Loading the local model and runtime (about 34 MB on first use)…",
    );
    if (!worker) {
      worker = new Worker(new URL("./embedding.worker.js", import.meta.url), {
        type: "module",
      });
      worker.onmessage = ({ data }) => {
        if (disposed || data.id !== sequence) return;
        if (data.type === "progress") {
          const p = data.progress;
          if (p.status === "progress") {
            status(
              `Loading ${p.file?.includes("onnx") ? "sentence model" : p.file || "model"} · ${Math.round(p.progress || 0)}%`,
            );
            $("progress").value = p.progress || 0;
          } else if (p.status === "embedding") {
            loaded = true;
            inference.modelState = "Ready";
            renderInferenceStats();
            status(`Embedding ${p.completed} of ${p.total} locally…`);
            $("progress").value = (p.completed / p.total) * 100;
          }
          return;
        }
        const job = pending;
        pending = null;
        busyState(false);
        if (data.type === "error") {
          worker?.terminate();
          worker = null;
          loaded = false;
          inference.modelState = "Error";
          renderInferenceStats();
          act("load").hidden = false;
          job?.reject(new Error(data.message));
        } else {
          if (job?.type !== "project") loaded = true;
          inference.modelState = loaded ? "Ready" : "Not loaded";
          if (data.embeddings?.length) {
            inference.completedRequests++;
            if (job?.purpose === "notes")
              inference.notesEmbedded += data.embeddings.length;
          }
          renderInferenceStats();
          act("load").hidden = loaded;
          job?.resolve(data);
        }
      };
      worker.onerror = (e) => {
        e.preventDefault();
        const job = pending;
        pending = null;
        worker?.terminate();
        worker = null;
        loaded = false;
        inference.modelState = "Error";
        renderInferenceStats();
        busyState(false);
        job?.reject(
          new Error(
            "The model worker could not start. Check that model and runtime assets are available, then retry.",
          ),
        );
      };
    }
    return new Promise((resolve, reject) => {
      pending = { resolve, reject, type, purpose };
      worker.postMessage({ id, type, texts, assetBase });
    });
  }
  function reportError(error, again) {
    if (error.message === "cancelled" || disposed) return;
    status(
      `Could not complete this request. ${error.message.slice(0, 220)} Your notes are safe.`,
      true,
    );
    retry = again;
    act("retry").hidden = false;
  }
  function reset(id = collectionSelect.value) {
    act("retry").hidden = true;
    retry = null;
    operation++;
    if (busy) cancel(undefined, false);
    collection = structuredClone(
      collections.find((c) => c.id === id) || collections[0],
    );
    collectionSelect.value = collection.id;
    const data = precomputed.collections[collection.id];
    embeddings = structuredClone(data.embeddings);
    points = structuredClone(data.points);
    query = collection.examples[0];
    queryInput.value = query;
    queryVector = data.examples[query];
    mode = "semantic";
    zoom = 1;
    pan = [0, 0];
    renderExamples();
    rank();
    selected = ranking[0]?.index || 0;
    selectionIsExplicit = false;
    render();
    status(
      "Precomputed example: real MiniLM embeddings, ready without a model download.",
    );
  }
  function renderExamples() {
    $("examples").replaceChildren();
    for (const [i, q] of collection.examples.entries()) {
      const b = el("button", "mm-example", q);
      b.type = "button";
      b.title = q;
      b.dataset.example = String(i);
      $("examples").append(b);
    }
  }
  function rank() {
    const exact = exactNoteIndex(collection.notes, query);
    if (exact >= 0) {
      ranking = [
        {
          note: collection.notes[exact],
          index: exact,
          score: null,
          matchKind: "id",
        },
      ];
      return;
    }
    ranking =
      mode === "semantic" && queryVector
        ? rankSemantic(collection.notes, embeddings, queryVector)
        : rankKeywords(collection.notes, query);
  }
  function render() {
    const isExact = ranking[0]?.matchKind === "id";
    $("query-heading").textContent = query
      ? `Matches for “${query}”`
      : "Browse your notes";
    const topics = [...new Set(collection.notes.map((n) => n.group))];
    $("scope").textContent =
      `Searches ${collection.notes.length} notes in “${collection.title}”: ${topics.join(", ")}. This collection may not contain what you need.`;
    $("browse-label").textContent =
      `Browse all ${collection.notes.length} notes`;
    $("corpus-description").textContent = collection.subtitle;
    $("corpus-notes").replaceChildren(
      ...collection.notes.map((n, index) => {
        const button = el("button", "mm-corpus-note");
        button.dataset.index = index;
        button.append(
          el("strong", "", n.title),
          el("span", "mm-small", `${n.id} · ${n.group}`),
        );
        return button;
      }),
    );
    for (const b of root.querySelectorAll("[data-mode]"))
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    $("ranking-info").textContent = isExact
      ? "Direct match to a note ID. This lookup does not use a semantic similarity score."
      : !query
        ? `Browsing the collection from “${collection.notes[0].title}”. Search an idea to rank the whole collection.`
        : mode === "semantic"
          ? "Ranked by sentence meaning. A higher cosine score means a closer embedding."
          : "Ranked by exact word overlap after common words are removed. Scores show shared query terms.";
    $("map-count").textContent =
      `${collection.notes.length} notes · ${new Set(collection.notes.map((n) => n.group)).size} groups`;
    $("results").replaceChildren();
    const matches =
      mode === "keyword"
        ? ranking.filter((r) => r.matchKind === "id" || r.score > 0)
        : ranking;
    $("result-count").textContent = matches.length
      ? `Top ${Math.min(5, matches.length)}`
      : "0 matches";
    if (!matches.length) {
      const empty = el(
        "li",
        "mm-empty",
        mode === "keyword"
          ? "No literal word matches. Try Semantic to look for related ideas."
          : "Semantic matches appear after the model finishes.",
      );
      $("results").append(empty);
    }
    for (const [position, r] of matches.slice(0, 5).entries()) {
      const li = el("li");
      const b = el(
        "button",
        "mm-result" + (r.index === selected ? " is-selected" : ""),
      );
      b.dataset.index = r.index;
      b.setAttribute("aria-pressed", String(r.index === selected));
      const num = el(
        "span",
        "mm-result-number",
        String(position + 1).padStart(2, "0"),
      );
      const content = el("span", "mm-result-copy");
      content.append(
        el("strong", "", r.note.title),
        el("span", "mm-small", `${r.note.id} · ${r.note.group}`),
        el("span", "mm-result-excerpt", r.note.text),
      );
      const score = el(
        "span",
        "mm-score",
        r.matchKind === "id"
          ? "ID"
          : mode === "semantic"
            ? r.score.toFixed(3)
            : `${Math.round(r.score * 100)}%`,
      );
      score.title =
        r.matchKind === "id"
          ? "Exact note ID"
          : mode === "semantic"
            ? "Cosine similarity"
            : "Query word overlap";
      b.append(num, content, score);
      li.append(b);
      $("results").append(li);
    }
    const note = collection.notes[selected];
    const noLiteralMatches =
      mode === "keyword" && !matches.length && !selectionIsExplicit;
    const groups = [...new Set(collection.notes.map((n) => n.group))];
    $("legend").replaceChildren(
      ...groups.map((group, i) => {
        const l = el("span", "mm-legend-item", group);
        l.style.setProperty("--group", palette[i % palette.length]);
        return l;
      }),
    );
    $("detail").replaceChildren();
    if (noLiteralMatches) {
      $("detail").append(
        el("h3", "", "No literal matches"),
        el(
          "p",
          "mm-note-body",
          "None of these notes share your query words. Try Semantic to look for a related idea, or add the information you want to find.",
        ),
      );
    } else if (note) {
      const eyebrow = el(
        "p",
        "mm-eyebrow",
        `SAVED NOTE / ${note.id} / ${note.group}`,
      );
      const title = el("h3", "", note.title);
      const body = el("p", "mm-note-body", note.text);
      $("detail").append(eyebrow, title, body);
      const noteTerms = new Set(terms(`${note.title} ${note.text}`));
      const overlap = terms(query).filter((word) => noteTerms.has(word));
      const evidence = el(
        "p",
        "mm-evidence",
        isExact
          ? selected === ranking[0].index
            ? "Opened by exact note ID. No model inference was needed."
            : "A related saved note. Return to the ID match in Matching notes."
          : `Shared query words: ${overlap.length ? overlap.join(", ") : "none"}. ${queryVector ? `Semantic similarity: ${cosine(embeddings[selected], queryVector).toFixed(3)}.` : "Run Semantic to compare the meaning."}`,
      );
      $("detail").append(evidence);
      const related = el("div", "mm-related");
      related.append(el("span", "mm-small", "Nearest neighbors"));
      for (const r of rankSemantic(
        collection.notes,
        embeddings,
        embeddings[selected],
      )
        .filter((r) => r.index !== selected)
        .slice(0, 2)) {
        const b = el("button", "", `${r.note.title} · ${r.score.toFixed(3)}`);
        b.dataset.index = r.index;
        related.append(b);
      }
      $("detail").append(related);
    }
    renderComparison(isExact);
    renderMap();
  }
  function renderComparison(isExact) {
    const compareSemantic = mode === "keyword";
    $("comparison-heading").textContent = compareSemantic
      ? "Semantic comparison"
      : "Literal word matches";
    $("comparison-query").textContent = query
      ? `Same query: “${query}”`
      : "Enter a query to compare the two methods.";
    $("comparison-results").replaceChildren();
    if (!query) {
      $("comparison-note").textContent =
        "Search an idea to see how meaning and shared-word matching differ.";
      return;
    }
    if (isExact) {
      $("comparison-note").textContent =
        "You entered a note ID. Use a phrase or sentence to compare meaning with shared words.";
      return;
    }
    if (compareSemantic && !queryVector) {
      const button = el("button", "", "Compare by meaning");
      button.dataset.mode = "semantic";
      $("comparison-results").append(button);
      $("comparison-note").textContent =
        "This needs the local sentence model. Keyword searches work without loading it.";
      return;
    }
    const compared = compareSemantic
      ? rankSemantic(collection.notes, embeddings, queryVector)
      : rankKeywords(collection.notes, query).filter((r) => r.score > 0);
    for (const r of compared.slice(0, 3)) {
      const item = el("li");
      const button = el("button", "mm-comparison-result");
      button.dataset.index = r.index;
      button.append(
        el("span", "", r.note.title),
        el(
          "span",
          "mm-score",
          compareSemantic
            ? r.score.toFixed(3)
            : `${Math.round(r.score * 100)}% words`,
        ),
      );
      item.append(button);
      $("comparison-results").append(item);
    }
    $("comparison-note").textContent = compared.length
      ? compareSemantic
        ? "Cosine similarity of full sentence vectors. This is not a probability."
        : "Exact query-word overlap after common words are removed. A different order can reveal a useful nonliteral match."
      : "No shared query words. Semantic matches may still express a related idea, but the collection may also be unrelated.";
  }
  function screenPoints() {
    const w = map.clientWidth,
      h = map.clientHeight;
    return points.map(([x, y]) => [
      w / 2 + x * w * 0.37 * zoom + pan[0],
      h / 2 + y * h * 0.36 * zoom + pan[1],
    ]);
  }
  function renderMap() {
    if (disposed || !points || !mapSection.open) return;
    const w = map.clientWidth,
      h = map.clientHeight,
      coords = screenPoints();
    $("nodes").replaceChildren();
    $("labels").replaceChildren();
    const svg = map.querySelector("svg");
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const groups = [...new Set(collection.notes.map((n) => n.group))];
    const related = rankSemantic(
      collection.notes,
      embeddings,
      embeddings[selected],
    )
      .filter((r) => r.index !== selected)
      .slice(0, 3);
    for (const r of related) {
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", coords[selected][0]);
      line.setAttribute("y1", coords[selected][1]);
      line.setAttribute("x2", coords[r.index][0]);
      line.setAttribute("y2", coords[r.index][1]);
      svg.append(line);
    }
    const top = new Set(
      ranking
        .slice(0, 5)
        .filter((r) => mode === "semantic" || r.score > 0)
        .map((r) => r.index),
    );
    coords.forEach(([x, y], i) => {
      const n = collection.notes[i];
      const b = el(
        "button",
        "mm-node" +
          (i === selected ? " is-selected" : "") +
          (top.has(i) ? " is-match" : ""),
      );
      b.type = "button";
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
      b.style.setProperty(
        "--group",
        palette[groups.indexOf(n.group) % palette.length],
      );
      b.dataset.index = i;
      b.tabIndex = i === selected ? 0 : -1;
      b.setAttribute(
        "aria-label",
        `${n.title}, ${n.group}${i === selected ? ", selected" : ""}`,
      );
      b.setAttribute("aria-pressed", String(i === selected));
      b.title = n.title;
      b.append(el("span"));
      $("nodes").append(b);
    });
    const priorities = [
      selected,
      ...ranking.slice(0, w < 460 ? 2 : 4).map((r) => r.index),
      ...groups.map((g) => collection.notes.findIndex((n) => n.group === g)),
    ];
    const occupied = [];
    for (const i of [...new Set(priorities)].slice(0, w < 460 ? 3 : 8)) {
      const [x, y] = coords[i];
      if (x < 12 || x > w - 12 || y < 10 || y > h - 35) continue;
      const title = collection.notes[i].title;
      const width = Math.min(178, title.length * 7.1 + 14);
      let placed = null;
      for (const [dx, dy] of [
        [15, -12],
        [-width - 15, -12],
        [15, 14],
        [-width - 15, -36],
        [15, -38],
        [-width - 15, 16],
      ]) {
        const bx = x + dx,
          by = y + dy;
        if (bx < 7 || bx + width > w - 7 || by < 7 || by + 26 > h - 36)
          continue;
        // Labels have no opaque backing in embedded charts. Keep text clear
        // of every dot as well as other labels.
        if (
          coords.some(
            ([nx, ny]) =>
              nx + 8 > bx &&
              nx - 8 < bx + width &&
              ny + 8 > by &&
              ny - 8 < by + 26,
          )
        )
          continue;
        if (
          occupied.some(
            (b) =>
              bx < b.x + b.w + 7 &&
              bx + width + 7 > b.x &&
              by < b.y + 32 &&
              by + 32 > b.y,
          )
        )
          continue;
        placed = { x: bx, y: by, w: width };
        break;
      }
      if (placed) {
        occupied.push(placed);
        const label = el(
          "span",
          "mm-node-label" + (i === selected ? " is-selected" : ""),
          title,
        );
        label.style.left = `${placed.x}px`;
        label.style.top = `${placed.y}px`;
        label.style.maxWidth = `${width}px`;
        $("labels").append(label);
      }
    }
  }
  function select(index, focus = false) {
    if (!collection.notes[index]) return;
    selected = index;
    selectionIsExplicit = true;
    render();
    if (focus)
      $("nodes")
        .querySelector(`[data-index="${index}"]`)
        ?.focus({ preventScroll: true });
  }
  async function search(value = queryInput.value) {
    const text = value.trim();
    if (!text) {
      status("Enter an idea to search.", true);
      queryInput.focus();
      return;
    }
    const token = ++operation;
    act("retry").hidden = true;
    retry = null;
    if (busy) cancel(undefined, false);
    queryInput.value = text;
    const cached = precomputed.collections[collection.id]?.examples[text];
    const lookup = exactNoteIndex(collection.notes, text);
    const isFreshSemantic = !cached && mode === "semantic" && lookup < 0;
    const startedAt = performance.now();
    try {
      const vector =
        cached ||
        (mode === "keyword" || lookup >= 0
          ? null
          : (await run("embed", [text], "query")).embeddings[0]);
      if (disposed || token !== operation) return;
      if (isFreshSemantic) {
        inference.lastQueryMs = performance.now() - startedAt;
        renderInferenceStats();
      }
      query = text;
      queryVector = vector;
      rank();
      selected = ranking[0]?.index || 0;
      selectionIsExplicit = false;
      zoom = 1;
      pan = [0, 0];
      render();
      status(
        lookup >= 0
          ? "Exact note ID found. Opened saved text without loading the model."
          : mode === "keyword"
            ? "Keyword results ready. Switch to Semantic to compare sentence meaning."
            : cached
              ? "Precomputed example: ranking uses genuine sentence embeddings."
              : `Search complete. Your query was embedded locally with ${MODEL}.`,
      );
    } catch (error) {
      if (token === operation) reportError(error, () => search(text));
    }
  }
  async function addNote() {
    const form = root.querySelector(".mm-add-form");
    if (!form.reportValidity()) return;
    if (collection.notes.length >= 100) {
      status(
        "This collection has 100 notes. Export and start a new collection to add more.",
        true,
      );
      return;
    }
    const token = ++operation;
    if (busy) cancel(undefined, false);
    const values = new FormData(form);
    const n = {
      id: `note-${Date.now()}`,
      title: values.get("title").trim(),
      text: values.get("text").trim(),
      group: values.get("group").trim(),
    };
    try {
      validateCollection({ version: 1, title: collection.title, notes: [n] });
      const result = await run("embed", [textForNote(n)]);
      if (disposed || token !== operation) return;
      const nextEmbeddings = [...embeddings, result.embeddings[0]];
      const projection = await run("project", nextEmbeddings);
      if (disposed || token !== operation) return;
      collection.notes.push(n);
      embeddings = nextEmbeddings;
      points = projection.points;
      selected = collection.notes.length - 1;
      selectionIsExplicit = true;
      zoom = 1;
      pan = [0, 0];
      rank();
      render();
      form.reset();
      form.elements.group.value = "My notes";
      status("Note embedded and added. Export your collection to keep it.");
    } catch (error) {
      if (token === operation) reportError(error, () => addNote());
    }
  }
  async function importFile(file) {
    if (!file) return;
    const token = ++operation;
    if (busy) cancel(undefined, false);
    try {
      if (file.size > 500000)
        throw new Error("Collection files must be smaller than 500 KB.");
      const content = await file.text();
      if (disposed || token !== operation) return;
      const next = validateCollection(JSON.parse(content));
      const result = await run("collection", next.notes.map(textForNote));
      if (disposed || token !== operation) return;
      collection = next;
      let custom = collectionSelect.querySelector("[value=imported]");
      if (!custom) {
        custom = el("option");
        custom.value = "imported";
        collectionSelect.append(custom);
      }
      custom.textContent = next.title;
      collectionSelect.value = "imported";
      embeddings = result.embeddings;
      points = result.points;
      query = "";
      queryInput.value = "";
      queryVector = embeddings[0];
      selected = 0;
      selectionIsExplicit = true;
      zoom = 1;
      pan = [0, 0];
      mode = "semantic";
      renderExamples();
      rank();
      render();
      status(
        `Imported ${next.notes.length} notes. Browse their relationships or search a new idea.`,
      );
    } catch (error) {
      if (token === operation) reportError(error, () => importFile(file));
    } finally {
      if (token === operation) $("import").value = "";
    }
  }
  on(root.querySelector(".mm-query-form"), "submit", (e) => {
    e.preventDefault();
    search();
  });
  on(root.querySelector(".mm-add-form"), "submit", (e) => {
    e.preventDefault();
    addNote();
  });
  on(collectionSelect, "change", () => reset());
  on($("import"), "change", (e) => importFile(e.target.files[0]));
  on(root, "click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.example !== undefined)
      search(collection.examples[Number(b.dataset.example)]);
    if (b.dataset.index !== undefined) {
      const index = Number(b.dataset.index);
      const fromMap = b.classList.contains("mm-node");
      const fromRanking = b.classList.contains("mm-result");
      select(index, fromMap);
      if (fromRanking)
        $("results")
          .querySelector('[data-index="' + index + '"]')
          ?.focus({ preventScroll: true });
      else if (!fromMap) {
        const heading = $("detail").querySelector("h3");
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
    if (b.dataset.mode) {
      mode = b.dataset.mode;
      selectionIsExplicit = false;
      if (
        mode === "semantic" &&
        query &&
        !queryVector &&
        exactNoteIndex(collection.notes, query) < 0
      ) {
        ranking = [];
        render();
        search(query);
      } else {
        rank();
        selected = ranking[0]?.index || 0;
        render();
      }
    }
    switch (b.dataset.action) {
      case "your-notes": {
        root.querySelector(".mm-collection-editor").open = true;
        root.querySelector('.mm-add-form input[name="title"]').focus();
        break;
      }
      case "cancel":
        cancel();
        break;
      case "retry":
        retry?.();
        break;
      case "load": {
        const load = () =>
          run("load")
            .then(() =>
              status(
                "Model is ready. Fresh text now runs entirely in your browser.",
              ),
            )
            .catch((e) => reportError(e, load));
        load();
        break;
      }
      case "zoom-in":
        zoom = Math.min(3, zoom * 1.3);
        renderMap();
        break;
      case "zoom-out":
        zoom = Math.max(0.65, zoom / 1.3);
        renderMap();
        break;
      case "fit":
        zoom = 1;
        pan = [0, 0];
        renderMap();
        break;
      case "reset":
        reset();
        break;
      case "export": {
        const blob = new Blob([serializeCollection(collection)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = el("a");
        a.href = url;
        a.download = "meaning-map-collection.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status(
          "Collection exported as validated, portable text. Embeddings regenerate on import.",
        );
        break;
      }
    }
  });
  on(map, "keydown", (e) => {
    const key = e.key;
    const index = e.target.dataset.index;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
      e.preventDefault();
      if (index !== undefined) {
        const coords = screenPoints(),
          a = coords[Number(index)],
          dir = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          }[key];
        const candidates = coords
          .map((p, i) => ({ i, dx: p[0] - a[0], dy: p[1] - a[1] }))
          .filter((p) => p.dx * dir[0] + p.dy * dir[1] > 1)
          .sort(
            (a, b) =>
              Math.hypot(a.dx, a.dy) +
              Math.abs(a.dx * dir[1] - a.dy * dir[0]) -
              (Math.hypot(b.dx, b.dy) +
                Math.abs(b.dx * dir[1] - b.dy * dir[0])),
          );
        if (candidates[0]) select(candidates[0].i, true);
      } else {
        const [x, y] = {
          ArrowLeft: [30, 0],
          ArrowRight: [-30, 0],
          ArrowUp: [0, 30],
          ArrowDown: [0, -30],
        }[key];
        pan = [pan[0] + x, pan[1] + y];
        renderMap();
      }
    } else if (key === "+" || key === "=" || key === "-") {
      e.preventDefault();
      zoom = Math.max(0.65, Math.min(3, zoom * (key === "-" ? 1 / 1.3 : 1.3)));
      renderMap();
    } else if ((key === "Enter" || key === " ") && index !== undefined) {
      e.preventDefault();
      select(Number(index), true);
    }
  });
  on(map, "pointerdown", (e) => {
    if (
      e.pointerType !== "mouse" ||
      e.button !== 0 ||
      e.target.closest("button")
    )
      return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, pan: [...pan] };
    map.setPointerCapture(e.pointerId);
  });
  on(map, "pointermove", (e) => {
    if (!drag) return;
    pan = [drag.pan[0] + e.clientX - drag.x, drag.pan[1] + e.clientY - drag.y];
    renderMap();
  });
  const stopDrag = () => {
    if (drag && map.hasPointerCapture(drag.id))
      map.releasePointerCapture(drag.id);
    drag = null;
  };
  on(map, "pointerup", stopDrag);
  on(map, "pointercancel", stopDrag);
  on(mapSection, "toggle", () => {
    if (mapSection.open) renderMap();
  });
  on(document, "visibilitychange", () => {
    if (document.hidden && busy)
      cancel(
        "Paused while this tab is hidden. Retry the action when you return.",
      );
  });
  const observer = new ResizeObserver(() => renderMap());
  observer.observe(map);
  cleanups.push(() => observer.disconnect());
  if (typeof IntersectionObserver !== "undefined") {
    const visibility = new IntersectionObserver(
      (entries) => {
        // Only one root is observed. A batch can contain multiple transitions;
        // apply its newest state, not an obsolete hidden entry at the start.
        const latest = entries.at(-1);
        if (latest && !latest.isIntersecting && busy)
          cancel(
            "Paused while the experiment is off screen. Your collection is unchanged.",
          );
      },
      { rootMargin: "500px" },
    );
    visibility.observe(root);
    cleanups.push(() => visibility.disconnect());
  }
  reset();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      stopDrag();
      cancel();
      for (const cleanup of cleanups) cleanup();
      root.remove();
    },
  };
}
