# Meaning Map — PR4 handoff

Current source is complete and frozen for root integration, 2026-09-09. Root owns Git and publication. This agent performed no Git actions.

## Current experience

The chart is always visible and primary. One search field and four short example chips sit above it; the selected original passage and three closest matches sit beside it. Semantic/Keyword remains a toggle. Same-query comparison, Your notes, How it works, and Model & activity are closed disclosures. The standalone header is omitted in embedded mode. The selected map label stays visible on narrow screens; ordinary labels avoid other labels and dots.

Field notes and Studio notebook now contain 60 notes each (120 total). Forty useful notes were added in `src/data/collections-v2.js`; the original 80-note corpus and evaluation were preserved unchanged. All 120 note vectors and eight example queries were regenerated with the genuine existing MiniLM q8 encoder. No model was trained or replaced. Groups remain authored colors; nearest links and ranking use full 384-dimensional embeddings; PCA positions are approximate.

The model warms automatically on mount. There is no manual Load local model button. Cached examples, keyword search and exact IDs work while warming; fresh searches and added/imported notes await the shared pending model. Only the newest queued operation may apply its result. Warmup contributes zero completed embedding requests. Initial below-fold visibility does not cancel it. Explicit Cancel and disposal terminate the worker, and disposal aborts pending note-seed fetches. Fresh inference still cancels when hidden/offscreen. Seed-fetch and model errors remain actionable even when concurrent startup stages finish in a different order.

## Exact root selectors

- `[data-ui=collection]`: values `field-notes`, `studio-notebook`; each starts with 60 `.mm-node` buttons.
- `[data-ui=query]`: labeled Search your notes; submit button accessible name `Find connections`.
- `.mm-example`: four per preset. Field names: `Cool a city`, `Borrow instead of buy`, `Protect old photos`, `Make room for wildlife`. Studio names: `Undo a mistake`, `Navigate by listening`, `Keep data when offline`, `Find the slow requests`.
- `.mm-map-section` is a **section**, not details. It has no summary and requires no opening click. `.mm-map` is visible on mount once notes arrive; `.mm-node-label.is-selected` labels the selection. Map controls: `Zoom in`, `Zoom out`, `Fit map`.
- `.mm-detail h3` is selected title. Default Field selection `The white roof`; Borrow example `Borrow a drill`; Studio listening example `The spoken interface`.
- `.mm-result`: up to three matches. `[data-mode=semantic]` and `[data-mode=keyword]` control method.
- `.mm-comparison > summary`: optional comparison. Keyword mode may offer `Compare by meaning` for a fresh query.
- `.mm-collection-editor > summary`: `Your notes`; open before add/import/export tests. `.mm-corpus > summary` opens all notes.
- `.mm-guide-details > summary`: `How it works`; `.mm-activity > summary`: `Model & activity`.
- Existing `[data-ui=status]`, `[data-ui=model-state]`, `[data-ui=request-count]`, `[data-ui=note-count]`, `[data-ui=query-time]` remain. Stats are now in the closed activity disclosure; text assertions can still read them, but open it before a screenshot.
- Model state becomes `Ready` after automatic warmup; requests remain `0` and last query `Not run yet`. A successful fresh query status contains `Search complete`. `Retry` appears on startup/model failure. `Load local model` does not exist.

## Honest evaluation wording

The current in-app text is: “On 24 separately written queries for these 120 notes, a relevant note ranked first in 18 cases and within three in all 24. This is a small authored diagnostic, not a guarantee. An earlier frozen 80-note comparison gave MiniLM and BGE-small the same paraphrase results, so we kept the smaller model. Exact IDs use direct lookup.”

`evaluation/expanded-probes.js` was written before measurement. `evaluation/expanded-results.json` records all 24 queries, relevance labels, top-three actual scores, literal matches, source hashes and the seed hash. Reproduction: `npm run prepare:data:expanded`. Results are **18/24 Hit@1, 24/24 Hit@3**; the six misses remain recorded. These are not merged with the old model comparison or represented as general model accuracy.

The original frozen 64 queries still evaluate the original 80 notes. Model comparison remains MiniLM 37/44 paraphrase Hit@1 and 42/44 Hit@3; BGE 37/44 and 42/44; E5 37/44 and 40/44. Original model/probe hashes are tested unchanged. The earlier comparison justified keeping the smaller MiniLM; it is not presented as an evaluation of the expanded corpus. The legacy 16-query diagnostic also remains separate.

## API, assets and budgets

API is unchanged: `mountExperiment(element, {assetBase:'/assets/meaning-map/', embedded:true})` returns `{dispose()}` synchronously; metadata instructions/limitations arrays and technique string remain. No new runtime dependency. Transformers stays a development dependency.

Copy all `public/*` into the supplied asset base. New seed:

- `public/data/meaning-notes-v2-96a7d40cd4df.json`
- SHA-256 `96a7d40cd4df8835950b970b28aba8f6d27adb21a14124232a22b27d7d936b84`
- 544,184 bytes raw; 205,325 bytes gzip.
- Fetched only when Meaning Map mounts. The corpus/vectors are no longer bundled in application JS. Imports and the Experiments collection page do not start loading; root should mount only on the detail page.

Final standalone build: main JS **26.60 KB raw / 10.34 KB gzip**, CSS **17.09 KB / 3.62 KB gzip**, worker **2.29 KB**. The seed is a separate lazy resource and exceeds the previous optional JS gzip budget by itself, but it no longer adds JS parse weight. Parent has been informed. Initial app budget is unaffected.

Model and runtime files, SHA manifests, licenses and budgets are unchanged: Xenova/all-MiniLM-L6-v2 revision `751bff37182d3f1213fa05d7196b954e230abad9`; model files 23,685,172 bytes, official Transformers.js 3.8.1 plus ONNX 1.22 runtime about 12 MB. Same-origin module worker, one WASM thread, no CDN, no note text in requests. Production CSP stays self-only connect/script plus `wasm-unsafe-eval`, worker self/blob; correct `.mjs` and `.wasm` MIME. Embedded map/detail/result backgrounds are transparent, map border is zero, so the host page texture shows through.

## Verification and captures

- **7/7 Node tests** passed, including current 120-vector norm/dimension/PCA parity, data SHA, original corpus/probe hashes, ranking and import validation.
- **11/11 production-CSP browser tests** passed with actual model assets: automatic warmup and zero inference count; fresh shade query; freshly added balcony note retrieved by unseen watering query; latest queued search; cached example superseding pending work; model retry and seed retry; delayed seed/model-error ordering; disposal; safe import and delayed File.text race; real export; exact IDs; optional comparison; 390px keyboard/viewport/map-label checks.
- Successful embeddings are never mocked; no cross-origin text/model requests occurred.
- `npm run capture` regenerated two focused transparent **1680×978 PNGs**, from actual selected map states, no panel border/header/forms/results sidebar. The second performs a fresh real-model listening-interface query. Both retain map labels and legend.

Primary names (unchanged): `examples/meaning-map-cooler-city.png`, `examples/meaning-map-accessible-studio.png`. Root should use these only for the primary preview. Extra actual UI QA images: `examples/meaning-map-search-first.png` (full tool), `examples/mobile-390.png`, `examples/meaning-map-inference-stats.png`.

## Files for PR4

Changed source: `src/index.js`, `src/style.css`, `scripts/capture.mjs`, `tests/math.test.js`, `tests/browser/meaning-map.spec.js`, `package.json`, `README.md`, `NOTES.md`, and the five images above.

New files: `src/data/collections-v2.js`, `src/data/seed-path.js`, `public/data/meaning-notes-v2-96a7d40cd4df.json`, `scripts/prepare-data-v2.mjs`, `evaluation/expanded-probes.js`, `evaluation/expanded-results.json`. `evaluation/README.md` documents the separate expansion. Do not omit the public seed when publishing. The frozen original `src/data/collections.js`, `src/data/embeddings.json`, old evaluation probes/results, model/runtime assets and dependencies are unchanged.

Limits remain 100 notes per active collection, 600 query characters, 1,800 note characters and tokenizer truncation at 512 tokens. Notes live only in the tab until exported. Local production server 5282 uses current dist; port 5182 belongs to an existing unrelated server and was not disturbed.
