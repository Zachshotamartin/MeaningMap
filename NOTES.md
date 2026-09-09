# Meaning Map handoff

Completed and frozen for integration on 2026-09-09. No git initialization, commits, pushes, or GitHub Actions. Root owns repository creation and publication.

## API

- Package `@zachshotamartin/meaning-map`; export `mountExperiment` and `metadata` from `src/index.js`; stylesheet export `./style.css`.
- `mountExperiment(element, {assetBase: '/assets/meaning-map/', embedded: true})` returns `{dispose()}` synchronously. Embedded mode removes only the standalone title/header. Metadata instructions and limitations are arrays of strings; technique is a string.
- CSS is scoped under `.meaning-map`; standalone body CSS is separate. Copy all `public/*` under the supplied assetBase. No Vite aliases or external CDN permissions required.

## Assets/runtime

- Model `Xenova/all-MiniLM-L6-v2`, revision `751bff37182d3f1213fa05d7196b954e230abad9`, q8, mean pooling, normalized 384-dimensional embeddings. The model is pretrained; the project creates original notes and embeddings, not a new encoder.
- Model base path relative to assetBase: `models/751bff37182d3f1213fa05d7196b954e230abad9/Xenova/all-MiniLM-L6-v2/`.
- Files: config.json 650 B; tokenizer.json 711,661 B; tokenizer_config.json 366 B; special_tokens_map.json 125 B; onnx/model_quantized.onnx 22,972,370 B.
- Runtime: `runtime/transformers-3.8.1.min.js` 888,173 B, unchanged official fully bundled ESM. Loaded dynamically in the worker only on demand.
- WASM: `runtime/onnx-1.22.0-dev-89f8206ba4/ort-wasm-simd-threaded.mjs` 20,856 B and matching `.wasm` 11,133,407 B. Both unchanged official ONNX Runtime assets.
- Public assets total about 35 MiB including notices. SHA-256 manifests: `public/models/MANIFEST.json` and `public/runtime/MANIFEST.json`. Model Apache license, runtime licenses, and upstream third-party notices included. Authored implementation/notes: MIT.
- Vite worker: `new Worker(new URL('./embedding.worker.js', import.meta.url), {type:'module'})`; assetBase arrives in the request message. ONNX uses one WASM thread, no proxy, no SharedArrayBuffer/COOP/COEP requirement. `env.allowRemoteModels=false`.
- The standard npm browser import emitted an unused extra 21.6 MB JSEP WASM asset. Self-hosting the official fully bundled ESM and configuring its explicit 11.1 MB WASM path avoids that duplicate. Actual browser inference verifies this path.

## Production requirements

`script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:`. No inline scripts, general JavaScript unsafe-eval, or third-party connections. The host must permit dynamic style properties and serve `.mjs` as JavaScript, `.wasm` as application/wasm. All successful inference tests saw zero cross-origin requests.

No model/runtime requests on mount, prepared example changes, or fresh keyword search. Model loads only for explicit load, fresh semantic query, add, or import. User text stays local. Cancellation terminates the worker; an operation epoch protects async file reads and multi-stage collection updates. Hidden/offscreen jobs are cancelled. Disposal releases listeners, observers, pointer capture, and worker.

## Dependencies/build

Node >=22; Vite 8.2.2; Playwright 1.63.0; Transformers.js 3.8.1. Sharp override 0.35.4 fixes transitive Node dependency audit findings; it is not in the browser text runtime. `npm audit`: zero vulnerabilities.

Latest standalone main JS: 384.99 KB /150.14 KB gzip; CSS 11.81 KB /2.81 KB gzip; worker 2.29 KB. Root's optional tool module includes metadata and may differ slightly. Preserve the portfolio initial JS budget. Real prepared vectors use seven decimal places (component error <=5e-8), reducing the optional payload without a blank initial map.

Package files whitelist includes source, public assets, README, LICENSE, and notices. Dry-run pack: 26 files, approximately 36.5 MB unpacked /19.7 MB packed; no scripts, caches, node_modules, or test output.

## Validation

- Build passes without bundle-size warning.
- Node tests: 5/5 pass (cosine, keyword/semantic ranking, deterministic PCA, genuine normalized vector/projection parity, import validation).
- Production CSP browser tests: 9/9 pass. Successful embeddings use the actual model, never mock vectors.
- Fresh query “Protect people from hot summer afternoons using trees and shade.” ranks “Shade is infrastructure” first.
- Newly pasted “Bottle-fed balcony” note is embedded, then found first by “Keep my tomato plants watered during a trip.”
- Model failure/retry, explicit cancellation, cached example superseding a delayed fresh query, reset superseding delayed File.text(), and unmount disposal pass.
- Invalid import preserves existing notes; valid import recomputes embeddings. HTML-like text renders literally. A real JSON download is parsed and checked.
- Fresh keyword searches request no model; switching to Semantic loads and computes the real encoder. Map keyboard, zoom/Fit, and 390px layout without horizontal overflow pass.

Evaluation: 16 human-labeled paraphrase queries absent from the six curated preset examples. MiniLM Hit@1=13/16 (81.25%), Hit@3=15/16 (93.75%), MRR=0.879464. Literal baseline Hit@1=8/16 (50%), Hit@3=10/16 (62.5%), MRR=0.603803. Full predictions and failures: `examples/retrieval-evaluation.json`; reproducible `npm run evaluate`. README labels this a small authored diagnostic set, not a broad independent benchmark or training result.

## Actual captures

`npm run capture` generates and overwrites genuine UI captures. Final screenshots visually reviewed:

- `examples/meaning-map-cooler-city.png` (2128×1082 focused map preview)
- `examples/meaning-map-accessible-studio.png` (2128×1082 focused map preview)
- `examples/mobile-390.png` (390px full-page browser verification)
- `examples/meaning-map-inference-stats.png` (additional loaded-model statistics verification)

The two primary thumbnails contain only the map panel: actual note positions, selected note, sparse labels, links, and legend. They omit the page header, search form, result sidebar, and statistics. The second capture performs an actual fresh query before recording its distinct selected map state. No fabricated results, image generation, or compositing.

## Visibility fix and inference statistics (PR2)

On `codex/visibility-resume`, the single-root IntersectionObserver uses the last entry in each batch, guarding an empty batch. The deterministic regression holds real model requests pending, delivers `[false, true]`, verifies work remains active, and releases the download to complete real inference. It also verifies `[true, false]` still cancels work and an empty batch has no effect.

Added a modest statistics strip: model Not loaded/Loading/Ready/Error, completed local embedding requests, embedded note count, and last fresh semantic query latency including first-load time. Cached examples and keyword searches do not add inference work. Projection-only jobs, failed/cancelled requests, and model-only loads do not inflate request/note counts. Successful note batches count as one request with their actual note count. Counters are scoped to the mount and retained across preset resets. This is explicitly labeled pretrained inference, with no training or checkpoint claims. Existing cancellation/retry behavior remains.

Final validation for PR2: build passes, Node 5/5, production browser 9/9 including actual-model statistics assertions, and focused captures regenerated. Transformers remains in devDependencies; browser runtime and asset paths are unchanged. No commits created by the agent.

Final preview-background adjustment: `--mm-bg` and the map panel now match Mesh Workshop's exact viewport color `#142321`; node halos and label backgrounds follow it. The green radial dot pattern is preserved. Rebuilt and regenerated both focused primary previews plus mobile. Computed production style verified `rgb(20, 35, 33)` with the original dot pattern, and the refreshed preview was visually inspected. No behavior changed; no additional behavioral tests were needed.

## In-app understanding follow-up

Added a compact guide before the search controls which remains visible with `embedded:true`. It gives the cooling-buildings → reflective-roofs example, explains dots as individual notes, colors as authored groups, lines as up to three closest full-vector neighbors, semantic versus literal word ranking, scores as similarity rather than probabilities, and approximate two-dimensional map distances. It states immediately that the model is pretrained and adding notes requires no retraining.

An expandable section separates the 80 searchable sample notes from the upstream model's training. It describes local 384-number embeddings and links directly to the official sentence-transformers model card, whose billion-plus sentence-pair fine-tuning dataset was verified. The local 13/16 first-result and 15/16 top-three figures are explicitly labeled a small authored diagnostic, not a guarantee or broad benchmark.

Build passed; all nine production browser tests passed after narrowing collection-editor summary selectors to accommodate the new disclosure. Actual embedded-mode UI was mounted and inspected through Vite, with the standalone header absent, guide present, disclosure/link/results visible, and no model loading. Desktop and 390px screenshots of the guide were visually inspected; no horizontal overflow. The map panel itself did not change, so focused primary previews were preserved. The mobile full-page verification image reflects the new guide. Existing model/request statistics and inference behavior remain intact. No commits made by the agent; files frozen for the root's final commit.

## Limits and local server

80 original notes across two 40-note presets. 100 notes maximum; query 600 chars; body 1,800 chars; title 100; group 40; model truncates at 512 tokens. Notes remain in this tab until exported. English similarity can miss nuance; cosine is not confidence or fact checking. Authored categories supply colors. PCA distance is approximate; full-vector ranking is authoritative.

Development port 5182 was occupied by an existing `node web/serve.mjs`; do not terminate it. Production tests/captures use 5282 with the CSP server in scripts/serve.mjs. npm run dev retains the requested 5182 port.
