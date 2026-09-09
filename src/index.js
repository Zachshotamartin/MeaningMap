import { MODEL, textForNote } from "./data/collections.js";
import { SEED_PATH } from "./data/seed-path.js";
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
    "Search an idea, then select a dot or a closest match to read the saved note.",
    "Arrow keys move between map notes. Fit map restores the overview.",
    "Add or import notes in Your notes, then export to keep your work.",
  ],
  limitations: [
    "English sentence embeddings can miss nuance and reflect training bias. Cosine similarity is not confidence.",
    "The PCA map compresses 384 dimensions into two. Visual distance is approximate; ranking uses full embeddings.",
    "Opening this tool warms a 23 MB pretrained model and 11 MB runtime, then search runs locally. No note text is transmitted.",
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
  root.innerHTML = `<header class="mm-header"><div><p class="mm-eyebrow">A SEMANTIC NOTEBOOK</p><h2>Meaning Map</h2><p class="mm-intro">Find a note even when you remember different words.</p></div></header>
  <div class="mm-searchbar"><label>Collection<select data-ui="collection"></select></label><form class="mm-query-form"><label for="${uid}-query">Search your notes</label><div class="mm-query-row"><input id="${uid}-query" data-ui="query" maxlength="600" autocomplete="off" placeholder="Describe an idea…" required><button class="mm-primary" type="submit">Find connections</button></div></form></div>
  <div class="mm-example-row"><div data-ui="examples" class="mm-examples"></div></div>
  <div class="mm-statusbar"><p data-ui="status" role="status" aria-live="polite">Loading notes and warming local search…</p><progress data-ui="progress" max="100" hidden aria-label="Model loading progress"></progress><button data-action="cancel" hidden>Cancel</button><button data-action="retry" hidden>Retry</button></div>
  <div class="mm-workspace"><section class="mm-map-section mm-map-panel" aria-label="Semantic note map"><div class="mm-map-heading"><div><h3>Notes by meaning</h3><span data-ui="map-count" class="mm-small">Loading notes…</span></div><div class="mm-map-tools"><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="zoom-in" aria-label="Zoom in">+</button><button data-action="fit">Fit map</button></div></div><div data-ui="map" class="mm-map" tabindex="0" role="group" aria-label="Note map. Tab selects a note; arrow keys navigate. With the map focused, arrows pan and plus or minus zoom."><svg class="mm-edges" aria-hidden="true"></svg><div data-ui="nodes" class="mm-nodes"></div><div data-ui="labels" class="mm-labels" aria-hidden="true"></div><div class="mm-map-caption">NEARBY IDEAS, DIFFERENT WORDS</div></div><div data-ui="legend" class="mm-legend"></div><p class="mm-map-footnote">Each dot is a note. Colors are authored groups. 2D spacing is approximate.</p></section>
  <aside class="mm-results"><div class="mm-tabs" role="group" aria-label="Ranking method"><button data-mode="semantic" aria-pressed="true">Semantic</button><button data-mode="keyword" aria-pressed="false">Keyword</button></div><article data-ui="detail" class="mm-detail" aria-label="Selected note"></article><div class="mm-results-header"><h3>Closest matches</h3><span data-ui="result-count" class="mm-small"></span></div><p data-ui="ranking-info" class="mm-ranking-info"></p><ol data-ui="results" class="mm-result-list"></ol><details class="mm-comparison" aria-label="Compare search methods for the same query"><summary data-ui="comparison-heading">Compare with words</summary><p data-ui="comparison-query" class="mm-small"></p><ol data-ui="comparison-results"></ol><p data-ui="comparison-note" class="mm-small"></p></details><p class="mm-score-note">Similarity is not confidence. Search finds saved notes, not generated answers.</p></aside></div>
  <details class="mm-collection-editor" hidden><summary>Your notes <span class="mm-small">Add · browse · import · export</span></summary><p data-ui="scope" class="mm-small"></p><details class="mm-corpus"><summary data-ui="browse-label">Browse collection</summary><p data-ui="corpus-description" class="mm-small"></p><div data-ui="corpus-notes" class="mm-corpus-notes"></div></details><div class="mm-editor-body"><form class="mm-add-form"><h3>Add a note</h3><label>Title<input name="title" required maxlength="100" placeholder="A short, useful title"></label><label>Note<textarea name="text" required maxlength="1800" rows="3" placeholder="Paste a thought or a paragraph."></textarea></label><label>Group<input name="group" maxlength="40" value="My notes" required></label><button class="mm-primary" type="submit">Embed & add note</button></form><div class="mm-file-tools"><button data-action="export">Export collection (.json)</button><label class="mm-file-label">Import collection<input data-ui="import" type="file" accept="application/json,.json"></label><button data-action="reset">Reset to preset</button><p class="mm-small">Up to 100 notes. Text stays in this tab until you export. Import validates text and regenerates embeddings before replacing your collection.</p></div></div></details>
  <details class="mm-guide-details"><summary>How it works</summary><div><p><strong>Meaning, not just shared words.</strong> An idea about cooling buildings can find a note about reflective roofs. Semantic search compares 384-number sentence vectors; Keyword counts exact shared words. Scores are similarities, not probabilities. Neither method can find information absent from your notes.</p><p><strong>Reading the map.</strong> Each dot is a note; colors are authored groups. Lines show up to three nearest notes in the full embedding space. The 2D PCA map compresses those vectors, so its distances are approximate.</p><p><strong>Pretrained, then used locally.</strong> MiniLM was trained upstream using more than a billion sentence pairs. These 120 notes are search material, not its training set. New notes need no retraining. The model warms automatically when this tool opens; your text stays in the browser. <a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2#background" target="_blank" rel="noreferrer">Official model card</a>.</p><p><strong>What we checked.</strong> On 24 separately written queries for these 120 notes, a relevant note ranked first in 18 cases and within three in all 24. This is a small authored diagnostic, not a guarantee. An earlier frozen 80-note comparison gave MiniLM and BGE-small the same paraphrase results, so we kept the smaller model. Exact IDs use direct lookup.</p></div></details>
  <details class="mm-activity"><summary>Model & activity</summary><div class="mm-inference-stats" aria-label="Local inference statistics"><dl><div><dt>Model</dt><dd data-ui="model-state">Not loaded</dd></div><div><dt>Completed requests</dt><dd data-ui="request-count">0</dd></div><div><dt>Notes embedded</dt><dd data-ui="note-count">0</dd></div><div><dt>Last fresh query</dt><dd data-ui="query-time">Not run yet</dd></div></dl><p>This visit only. Warmup and cached examples do not count as embedding requests. Query time includes loading when needed. Pretrained inference; no training.</p></div></details>
  <footer class="mm-footer"><span>MiniLM · local inference · 120 sample notes</span></footer>`;
  if (options.embedded) {
    root.classList.add("mm-embedded");
    root.querySelector(".mm-header").remove();
  }
  element.append(root);
  const $ = (name) => root.querySelector(`[data-ui="${name}"]`);
  const act = (name) => root.querySelector(`[data-action="${name}"]`);
  const collectionSelect = $("collection"),
    queryInput = $("query"),
    map = $("map");
  let collections = [],
    precomputed = null,
    ready = false,
    warming = false,
    warmingPromise = null,
    seedController = null,
    seedError = null,
    modelError = null;
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
    if (seedError) {
      message = `Could not load the notes. ${seedError.message} Retry to load the collection.`;
      error = true;
    }
    $("status").textContent = message;
    $("status").classList.toggle("mm-error", error);
  };
  function busyState(value) {
    busy = value;
    act("cancel").hidden = !value;
    $("progress").hidden = !value;
    root.querySelector(".mm-query-form button").disabled =
      !ready || (value && !warming);
    root.querySelector(".mm-add-form button").disabled =
      !ready || (value && !warming);
    collectionSelect.disabled = !ready || (value && !warming);
  }
  function cancel(
    message = "Cancelled. Your collection is unchanged.",
    invalidate = true,
  ) {
    if (invalidate) operation++;
    sequence++;
    warming = false;
    warmingPromise = null;
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
    if (busy && !warming) cancel(undefined, false);
    const id = ++sequence;
    busyState(true);
    inference.modelState = loaded ? "Ready" : "Loading";
    renderInferenceStats();
    act("retry").hidden = !seedError;
    $("progress").removeAttribute("value");
    status(
      loaded
        ? "Computing sentence embeddings locally…"
        : "Warming local search…",
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
            status(`Warming local search · ${Math.round(p.progress || 0)}%`);
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
  function warmModel() {
    if (loaded) return Promise.resolve();
    if (warmingPromise) return warmingPromise;
    modelError = null;
    warming = true;
    const promise = run("load")
      .then(() => {
        if (!disposed)
          status(ready ? "Ready · local search." : "Loading notes…");
      })
      .finally(() => {
        if (warmingPromise === promise) {
          warmingPromise = null;
          warming = false;
          if (!disposed) busyState(false);
        }
      });
    warmingPromise = promise;
    return promise;
  }
  function warmAutomatically() {
    return warmModel().catch((error) => {
      if (error.message === "cancelled" || disposed) return;
      modelError = error;
      reportError(error, retryStartup);
    });
  }
  function retryStartup() {
    if (!ready) loadSeed();
    return warmAutomatically();
  }
  async function loadSeed() {
    seedController?.abort();
    seedError = null;
    const controller = new AbortController();
    seedController = controller;
    try {
      const response = await fetch(new URL(SEED_PATH, assetBase), {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Notes could not load (${response.status}).`);
      const seed = await response.json();
      if (disposed || seedController !== controller) return;
      if (
        seed.version !== 2 ||
        seed.model !== MODEL ||
        seed.dimensions !== 384 ||
        !seed.collections
      )
        throw new Error("The note data does not match this model.");
      const next = Object.values(seed.collections);
      if (
        next.length !== 2 ||
        next.some(
          (d) =>
            !d.collection?.notes?.length ||
            d.embeddings?.length !== d.collection.notes.length ||
            d.points?.length !== d.collection.notes.length ||
            d.embeddings.some(
              (v) => v.length !== 384 || !v.every(Number.isFinite),
            ) ||
            d.points.some((p) => p.length !== 2 || !p.every(Number.isFinite)),
        )
      )
        throw new Error("The note data is incomplete.");
      precomputed = seed;
      collections = next.map((d) => d.collection);
      collectionSelect.replaceChildren(
        ...collections.map((c) => {
          const option = el("option", "", c.title);
          option.value = c.id;
          return option;
        }),
      );
      ready = true;
      root.classList.add("mm-ready");
      root.querySelector(".mm-collection-editor").hidden = false;
      reset(collections[0].id);
      busyState(busy);
      if (modelError) reportError(modelError, retryStartup);
    } catch (error) {
      if (
        !disposed &&
        seedController === controller &&
        error.name !== "AbortError"
      ) {
        seedError = error;
        reportError(error, retryStartup);
      }
    }
  }
  function reset(id = collectionSelect.value) {
    act("retry").hidden = true;
    retry = null;
    operation++;
    if (busy && !warming) cancel(undefined, false);
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
      loaded
        ? "Ready · local search."
        : "Warming local search… examples are ready.",
    );
  }
  function renderExamples() {
    $("examples").replaceChildren();
    for (const [i, q] of collection.examples.entries()) {
      const b = el("button", "mm-example", collection.exampleLabels?.[i] || q);
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
          ? "Full-vector cosine similarity"
          : "Exact query-word overlap";
    $("map-count").textContent =
      `${collection.notes.length} notes · ${new Set(collection.notes.map((n) => n.group)).size} groups`;
    $("results").replaceChildren();
    const matches =
      mode === "keyword"
        ? ranking.filter((r) => r.matchKind === "id" || r.score > 0)
        : ranking;
    $("result-count").textContent = matches.length
      ? `Top ${Math.min(3, matches.length)}`
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
    for (const [position, r] of matches.slice(0, 3).entries()) {
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
      content.append(el("strong", "", r.note.title));
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
          : `${queryVector ? `${cosine(embeddings[selected], queryVector).toFixed(3)} cosine · ` : ""}${overlap.length} shared query words`,
      );
      $("detail").append(evidence);
    }
    renderComparison(isExact);
    renderMap();
  }
  function renderComparison(isExact) {
    const compareSemantic = mode === "keyword";
    $("comparison-heading").textContent = compareSemantic
      ? "Semantic comparison"
      : "Compare with words";
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
    if (disposed || !points) return;
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
        // Ordinary labels have no opaque backing in embedded charts. The
        // selected label has a solid fill and must remain readable on mobile.
        if (
          i !== selected &&
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
    if (!ready) return;
    const text = value.trim();
    if (!text) {
      status("Enter an idea to search.", true);
      queryInput.focus();
      return;
    }
    const token = ++operation;
    act("retry").hidden = true;
    retry = null;
    if (busy && !warming) cancel(undefined, false);
    queryInput.value = text;
    const cached = precomputed.collections[collection.id]?.examples[text];
    const lookup = exactNoteIndex(collection.notes, text);
    const isFreshSemantic = !cached && mode === "semantic" && lookup < 0;
    const startedAt = performance.now();
    try {
      if (isFreshSemantic) {
        await warmModel();
        if (disposed || token !== operation) return;
      }
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
          ? "Exact note ID found · opened saved text directly."
          : mode === "keyword"
            ? "Keyword results ready."
            : cached
              ? "Example ready · real sentence vectors."
              : "Search complete · local results.",
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
    if (busy && !warming) cancel(undefined, false);
    const values = new FormData(form);
    const n = {
      id: `note-${Date.now()}`,
      title: values.get("title").trim(),
      text: values.get("text").trim(),
      group: values.get("group").trim(),
    };
    try {
      validateCollection({ version: 1, title: collection.title, notes: [n] });
      await warmModel();
      if (disposed || token !== operation) return;
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
    if (busy && !warming) cancel(undefined, false);
    try {
      if (file.size > 500000)
        throw new Error("Collection files must be smaller than 500 KB.");
      const content = await file.text();
      if (disposed || token !== operation) return;
      const next = validateCollection(JSON.parse(content));
      await warmModel();
      if (disposed || token !== operation) return;
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
    if (!b || (!ready && !["cancel", "retry"].includes(b.dataset.action)))
      return;
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
  on(document, "visibilitychange", () => {
    if (document.hidden && busy && !warming)
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
        if (latest && !latest.isIntersecting && busy && !warming)
          cancel(
            "Paused while the experiment is off screen. Your collection is unchanged.",
          );
      },
      { rootMargin: "500px" },
    );
    visibility.observe(root);
    cleanups.push(() => visibility.disconnect());
  }
  busyState(false);
  loadSeed();
  warmAutomatically();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      seedController?.abort();
      stopDrag();
      cancel();
      for (const cleanup of cleanups) cleanup();
      root.remove();
    },
  };
}
