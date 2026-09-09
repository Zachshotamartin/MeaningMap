# Meaning Map — current handoff

Search refinement completed and frozen for root integration, 2026-09-09. Root owns Git, pull requests and publication. No Git commands or actions were performed by this agent.

## Product changes

- Search is primary: the complete saved passage and its ID/group are prominent, ranked results include original-text excerpts, and a simultaneous comparison shows the same query's literal word matches. Switching to Keyword exposes the semantic comparison instead; a fresh meaning comparison explicitly loads the local encoder.
- The selected passage reports actual shared query words and full-vector cosine similarity. There are no generated explanations, answers, confidence probabilities or synthetic scores.
- Collection topics and a browse-all-notes disclosure expose what can actually be searched. A Use your own notes button opens/focuses the existing add form. Existing 80 original notes and their embeddings remain unchanged, deliberately frozen during the model comparison.
- A complete note ID routes directly to that note without model inference. Exact case takes priority; a case-insensitive fallback must be unique. Substrings do not match. The result shows `ID`, with explicit direct-lookup copy, never a perfect cosine score.
- A query with no literal matches shows a clear empty state instead of the previously selected passage. Explicit browsing still opens a note after that empty state.
- The map is now secondary inside `.mm-map-section`, closed by default. Open `.mm-map-section > summary` before map-node tests/captures. Node DOM creation is deferred until the map is open. Map controls, full-vector nearest links, authored group colors and keyboard navigation are retained.
- A brief example remains above search; the fuller model/map explanation sits in a disclosure below the tool. It distinguishes the 80 search items from upstream pretrained weights, says new notes need no retraining, links the official model card and summarizes the expanded diagnostic honestly.

## Model comparison and decision

Keep MiniLM. No encoder, tokenizer, prepared vector, model asset, runtime asset, license, hash or asset path changed.

`evaluation/probes-v2.js` contains 64 queries/relevance labels frozen by SHA-256 together with `src/data/collections.js` before measuring candidates. The corpus and probes were never revised after seeing results. There are 44 paraphrase/synonym cases, four exact titles, four exact IDs and twelve unrelated questions. It is an authored diagnostic, not an independent public benchmark. E5 was added as a candidate after BGE tied MiniLM, before measuring E5; this sequence is recorded in `evaluation/preregistration-v2.json`.

| q8 encoder | Paraphrase Hit@1 | Paraphrase Hit@3 | Model bytes |
| --- | ---: | ---: | ---: |
| MiniLM L6 | 37/44 | 42/44 | 23,685,172 |
| BGE-small v1.5 | 37/44 | 42/44 | 34,726,996 |
| E5-small v2 | 37/44 | 40/44 | 34,726,852 |

On all 52 answerable queries, native MiniLM is 41/52 Hit@1 and 46/52 Hit@3. Exact-ID navigation raises these to 45/52 and 50/52, explicitly separate from semantic model quality. Literal overlap is 25/52 Hit@1 and 34/52 Hit@3. Zero-overlap notes are excluded from literal results, matching the UI. The four ID failures are not a reason to enlarge an encoder.

All seven MiniLM paraphrase top-result misses are documented, including the severe export-information query miss at rank 23. BGE/E5 trade failures instead of improving overall usefulness. Unrelated questions still return nearby notes; no threshold was fitted to this test set and no cosine is presented as calibrated confidence. The collection scope and original-text presentation make this limitation visible.

Reproduction: `npm run evaluate:compare` runs all three models and writes `evaluation/model-comparison-v2.json`, including every prediction, labels, scores, ranks, pooling/prefix choices, asset sizes/SHA-256 hashes and Node warm-query timings. Candidate q8 models download only into ignored `.cache/comparison-models/`, approximately 69 MB together, and are not shipped. BGE follows official CLS pooling plus its retrieval query instruction; E5 uses mean pooling and query/passage prefixes. Full rationale and official model-card/license links are in `evaluation/README.md`. The original `npm run evaluate` 16-query diagnostic remains separately reproducible.

## API and integration

- Package `@zachshotamartin/meaning-map`; exports `mountExperiment`, `metadata`, and `./style.css`.
- `mountExperiment(element, {assetBase: '/assets/meaning-map/', embedded: true})` returns `{dispose()}` synchronously. Embedded mode omits the standalone title/header. Metadata instructions/limitations are arrays; technique is a string.
- CSS is scoped below `.meaning-map`; standalone body CSS is separate. Copy all `public/*` under the supplied assetBase. Default standalone assetBase resolves `./` against the document URL.
- Existing `.mm-results`, `.mm-detail`, `Find connections`, `[data-ui=status]`, model-state/request-count/note-count/query-time selectors remain. Map selectors require opening the new disclosure.
- New selectors: `.mm-comparison`, `.mm-corpus`, `.mm-corpus-note`, `.mm-result-excerpt`, `[data-ui=scope]`, `[data-ui=query-heading]`.
- No new runtime dependencies. Transformers remains a development dependency, so host installations do not install native Node inference packages.

## Shipped assets and CSP (unchanged)

- Model `Xenova/all-MiniLM-L6-v2`, revision `751bff37182d3f1213fa05d7196b954e230abad9`, q8, mean pooling, normalized 384 dimensions.
- Base path: `models/751bff37182d3f1213fa05d7196b954e230abad9/Xenova/all-MiniLM-L6-v2/` under assetBase.
- Files: config.json 650 B; tokenizer.json 711,661 B; tokenizer_config.json 366 B; special_tokens_map.json 125 B; onnx/model_quantized.onnx 22,972,370 B.
- Official bundled runtime `runtime/transformers-3.8.1.min.js`: 888,173 B.
- `runtime/onnx-1.22.0-dev-89f8206ba4/ort-wasm-simd-threaded.mjs`: 20,856 B; matching WASM: 11,133,407 B.
- Public assets about 35 MiB; model/runtime SHA-256 manifests and Apache/MIT/third-party licenses remain included.
- Module worker uses explicit assetBase, one WASM thread, no ONNX proxy, no SharedArrayBuffer/COOP/COEP requirement. `env.allowRemoteModels=false`; no CDN fallback. User note/query text stays in the worker, never in a network request.
- Production CSP: `script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:`. Serve `.mjs` as JavaScript, `.wasm` as application/wasm and permit dynamic style properties. No general JS unsafe-eval or inline scripts.
- No model/runtime request on mount, preset examples, fresh keyword search or exact-ID lookup. Explicit load, fresh semantic query, add or import trigger local inference.
- Cancellation terminates the worker. Sequence plus operation epoch protects fresh/cached requests, slow File.text(), and multi-stage collection updates. Hidden/offscreen work is cancelled; latest IntersectionObserver batch entry controls visibility. Disposal releases listeners, observers, pointer capture and worker.

## Validation and build

Final build: standalone main JS 392.91 KB raw / 152.62 KB gzip; CSS 14.69 KB / 3.31 KB gzip; worker 2.29 KB. No bundle warning. This remains within root's 450 KB raw / 175 KB gzip optional-tool budget; root's initial app budget stays separate.

Node tests **6/6** passed. Production-CSP browser tests **11/11** passed, including actual local model inference:

- Fresh tree/shade query returns Shade is infrastructure first.
- A freshly embedded Bottle-fed balcony note is retrieved first by an unseen tomato-watering-during-a-trip query.
- Same-query semantic/literal comparison, original text, direct ID lookup without model requests, corpus browsing, own-notes focus, unrelated question, and browse-after-no-literal-match behavior.
- Model failure/retry, explicit cancel, cached example superseding a delayed fresh query, reset superseding slow file read, and disposal.
- Batched visibility false/true preserves a held real request; true/false cancels; empty batch is safe.
- Invalid import preserves notes; valid import recomputes embeddings; markup stays literal; actual exported JSON parses.
- Keyboard map controls and 390px viewport without horizontal overflow.

All successful model tests use actual vectors, not mocks. Successful inference generated zero cross-origin requests. Existing inference statistics remain truthful: completed embedding requests, notes embedded, last fresh-query time including loading, and model state; cached/keyword/ID work does not inflate counts.

## Final genuine previews

`npm run capture` opens the optional map and records two actual distinct states. The second runs a fresh real-model listening-interface query and verifies The spoken interface.

- `examples/meaning-map-cooler-city.png`
- `examples/meaning-map-accessible-studio.png`

Both primary previews are **1680×858 transparent PNGs**: actual map dots, labels, nearest links and legend, with no panel background, border, title controls or footnote. Export-only browser styling narrows the chart for a closer view. The background alpha is zero, allowing root's textured #142020 page to show through exactly. The standalone map retains its #142321 background. Embedded mode uses transparent map/detail/result backgrounds, no map border, and outline rings for selection so the host page texture shows through. Labels avoid other labels and note dots. The dot pattern and controls remain. No image generation, compositing or fake results.

Additional actual QA captures: `examples/meaning-map-search-first.png` (complete interface), `examples/mobile-390.png` (390 CSS px), and `examples/meaning-map-inference-stats.png`. Root should use only the two focused transparent PNGs for primary previews.

## Files changed for this refinement

`src/index.js`, `src/style.css`, `src/math.js`, `tests/math.test.js`, `tests/browser/meaning-map.spec.js`, `scripts/capture.mjs`, `scripts/compare-models.mjs`, `package.json`, `README.md`, `NOTES.md`, `evaluation/probes-v2.js`, `evaluation/preregistration-v2.json`, `evaluation/model-comparison-v2.json`, `evaluation/README.md`, and the five screenshots listed above. Public assets, prepared embeddings, original collections and dependencies are unchanged. New evaluation files must be included in root's source commit; `.cache/`, test-results and dist remain ignored.

## Local limits/server

80 notes across two presets, 100 notes maximum per collection; query 600 chars, body 1,800 chars, title 100, group 40, tokenizer truncation 512 tokens. Text persists only in the tab until export. English semantic similarity can miss nuance and facts. Map PCA is approximate; ranking uses full vectors.

Port 5182 is occupied by an existing `node web/serve.mjs`; do not terminate it. Production tests/captures use 5282 via scripts/serve.mjs. The npm dev command retains the requested 5182 port.
