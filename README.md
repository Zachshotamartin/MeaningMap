# Meaning Map

A working semantic notebook with an always-visible map. Search for an idea, select a dot, and read the original saved passage beside its closest matches. Four short example phrases help you start. The two collections contain **120 notes**: Field notes and Studio notebook, 60 each.

The Semantic/Keyword toggle changes ranking; a closed comparison disclosure can show the other method for the same query. Your notes, How it works, and Model & activity keep editing, background and statistics below the map. Results show actual saved text and cosine similarity, not generated answers or confidence probabilities. Enter a complete note ID such as `f26` to open it directly without inference.

![Actual Meaning Map interface](examples/meaning-map-cooler-city.png)

## Run

Requires Node 22 or newer.

```sh
npm ci
npm run dev
```

The development server uses `http://127.0.0.1:5182`. Production verification uses a separate local server on port 5282 with the same-origin CSP described below.

```sh
npm run build
npm test
npm run test:browser
npm run capture
```

`test:browser` starts the production server when needed. `capture` also starts it when needed and writes two focused map previews from the actual UI, plus mobile and inference-statistics verification images. Primary previews contain only the actual map, labels and legend, at 2× pixel density. Their background is transparent and the frame, heading controls and footnote are omitted for export; the live UI is unchanged. Build first. The source of both standalone and embedded experiences is `src/index.js`.

## What is actually learned

The sentence encoder is **pretrained**, not trained by this project. It is the Apache-2.0-licensed [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) ONNX conversion of [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), pinned to revision `751bff37182d3f1213fa05d7196b954e230abad9`.

This project writes original notes and generates real 384-dimensional sentence embeddings from their titles and bodies. It uses q8 inference, attention-aware mean pooling, and L2 normalization through [Transformers.js](https://huggingface.co/docs/transformers.js/v3.8.1/api/pipelines). Group labels are authored categories used for color; they are not model-generated clusters and are excluded from embedding input.

Semantic search compares the full query vector with each note using cosine similarity. The optional comparison and Keyword tab use an explicitly labeled literal baseline: the fraction of unique query terms found in a note's title or text, after common words are removed. It does not stem words and is not AI.

The map uses deterministic principal component analysis (PCA), implemented with a centered Gram matrix and power iteration. It shows the two leading components. These axes have no assigned conceptual meaning, and two dimensions necessarily discard information. All ranking and nearest-neighbor links use the full 384 dimensions, not map distances. Labels are collision-checked and limited at small widths.

### Reproduce embeddings and evaluation

```sh
node scripts/fetch-model.mjs       # optional: restore pinned official model files
node scripts/prepare-runtime.mjs   # restore official runtime from npm dependencies
npm run prepare:data:expanded    # current 120-note corpus and separate diagnostic
npm run prepare:data             # frozen original 80-note corpus
npm run evaluate                 # original 16-query diagnostic
npm run evaluate:compare         # frozen 64-query, three-model comparison
```

The included model files make data generation work without a Hugging Face request. `prepare:data:expanded` runs the same q8 encoder through ONNX Runtime Node for all 120 notes and eight example queries, then writes a content-hashed JSON file in `public/data/`. The 544,184-byte seed (205,325 bytes gzip) is fetched only when the tool mounts, separately from application JavaScript. Stored components are rounded to seven decimal places (at most 0.00000005 component error); projection is recomputed from those stored vectors. Fresh browser queries use full runtime float32 output. Tests verify normalization, dimensions, ranking, PCA parity, seed integrity and the unchanged frozen evaluation hashes. The legacy `prepare:data` writes the original `src/data/embeddings.json`.

The earlier model comparison freezes 64 authored queries and the original 80-note corpus by SHA-256 before measuring candidate encoders. It contains 44 paraphrase/synonym cases, four exact titles, four exact IDs and twelve out-of-scope questions. No labels or note texts were revised after seeing results, and no model was trained. This is a local diagnostic, not an independent public benchmark.

| q8 encoder       | Paraphrase Hit@1 | Paraphrase Hit@3 | Model files |
| ---------------- | ---------------: | ---------------: | ----------: |
| MiniLM (shipped) |            37/44 |            42/44 |   23.685 MB |
| BGE-small v1.5   |            37/44 |            42/44 |   34.727 MB |
| E5-small v2      |            37/44 |            40/44 |   34.727 MB |

MiniLM stays because the larger downloads did not improve these results. On all 52 answerable queries MiniLM scores 41/52 Hit@1 and 46/52 Hit@3; the explicit ID-lookup rule raises these to 45/52 and 50/52 without changing semantic inference. The literal baseline scores 25/52 and 34/52. Similarity search still returns neighbors for questions absent from the collection; the interface never treats a cosine score as a confidence probability.

[Full protocol, failures, model configurations and reproduction notes](evaluation/README.md) accompany [every prediction and metric](evaluation/model-comparison-v2.json). Candidate models download only into ignored development cache; the browser still ships the same MiniLM assets. The legacy 16-query diagnostic remains in examples/retrieval-evaluation.json and is not merged with these counts.

### Current expanded collection diagnostic

The 120-note collection has a separate set of 24 relevance queries, written before generating embeddings and measuring results. MiniLM retrieves the labeled note first in **18/24** cases and within the first three in **24/24**. This is a small authored diagnostic, not an independent benchmark or an estimate of general accuracy. The six first-place misses remain recorded, and the probes were not changed to improve the score. These results are not combined with, or substituted for, the frozen 80-note model comparison above.

`evaluation/expanded-probes.js` contains queries and labels; `evaluation/expanded-results.json` contains source hashes, every top-three prediction, literal matches, metrics and the exact seed hash. `npm run prepare:data:expanded` reproduces both the current seed and this report. It does not change the encoder.

## Local inference and limits

Opening Meaning Map automatically warms the model in its worker while the prepared map loads. No manual Load button is needed. A fresh semantic search or add/import operation waits for the shared pending load; prepared examples, keyword search and exact-ID lookup can work while it warms. The first load transfers approximately 35.7 MB including the model, tokenizer, JavaScript and WASM runtime, plus the separate note seed. The browser can cache these assets where supported. Merely importing the package does not fetch the seed or model; hosts should mount it only on the Meaning Map page.

The official Transformers.js 3.8.1 browser bundle is self-hosted unchanged. Its ONNX backend uses a single WASM thread in a dedicated module worker. No SharedArrayBuffer, COOP/COEP, WebGPU, server inference, API key, or external runtime CDN is required. User text is passed to the local worker and never sent in a network request. No model code runs on the interface thread.

The npm Transformers.js package is a development dependency for regenerating embeddings and running the evaluation scripts. Hosts importing this experiment use the checked-in browser runtime, so they do not install the native Node inference dependencies.

A maximum of 100 notes bounds computation. Each note has a 100-character title, 1,800-character body, and 40-character group. Queries are capped at 600 characters. Tokenization truncates long input to the model's configured 512-token limit. English short paragraphs work best; similarity can miss negation, nuance, names, or facts, and can reflect the encoder's biases. Scores are not confidence or truthfulness estimates.

Cancellation terminates the worker, including model loading. A separate operation epoch protects async file reads and multi-stage add/import operations; late completions cannot replace a newer request. Active embedding work is cancelled when hidden/offscreen. Startup warmup continues if the tool initially appears below the fold, so it is ready when reached. Explicit Cancel and disposal still terminate warmup. Disposal also aborts the seed fetch and releases listeners, observers, pointer capture, and the worker. There is no continuous animation or computation when idle.

The Model & activity disclosure reports this visit's model state, completed embedding requests, successfully embedded note texts, and the last fresh semantic query's elapsed time. Query timing includes model loading when needed. A batch of imported notes counts as one request; each embedded note contributes to the note counter. Warmup, cached examples, keyword search, projection-only work, and failed/cancelled requests do not increment completed request counts. These are inference measurements for a pretrained encoder, not training metrics. Counters persist across preset changes and reset on unmount.

## Keyboard, mobile, and collection files

- The map is always visible. Use Tab to reach the selected map dot. Arrow keys navigate geometrically to another note. Enter/Space selects it.
- With the map itself focused, arrows pan; plus/minus zoom. Buttons provide touch alternatives and **Fit map** restores the overview. Desktop mouse dragging also pans; mobile page scrolling remains available.
- Ranked results and nearest-neighbor links are ordinary labeled buttons. Status/errors use a live region; inputs have labels and visible focus.
- **Your notes** contains add, import, export, and reset actions. Added notes live in this tab only. Export before navigating away.
- JSON export contains versioned plain text, not opaque model vectors. Import validates a maximum 500 KB file with 1–100 notes, then regenerates embeddings before replacing the active collection. Invalid data leaves existing work intact. HTML-like text is rendered literally via `textContent`.

Portable schema:

```json
{
  "version": 1,
  "title": "My notebook",
  "notes": [
    {
      "id": "note-1",
      "title": "A thought",
      "text": "The note body.",
      "group": "Ideas"
    }
  ]
}
```

## Embed in the portfolio

```js
import { mountExperiment, metadata } from "@zachshotamartin/meaning-map";
import "@zachshotamartin/meaning-map/style.css";

const instance = mountExperiment(container, {
  assetBase: "/assets/meaning-map/",
  embedded: true,
});
// On unmount:
instance.dispose();
```

The function returns `{ dispose() }` synchronously and owns only its DOM subtree. `embedded: true` omits the standalone title/header; the parent can provide its own title. `metadata.instructions` and `metadata.limitations` are arrays of strings, and `metadata.technique` is a string. CSS is scoped below `.meaning-map` and inherits the host font. Embedded map/detail/result backgrounds are transparent and the map has no frame, allowing the host page texture to show through.

Copy **all contents of `public/`** under the `assetBase` path. Default standalone assetBase resolves `./` against the document base URL. Model paths contain their immutable upstream revision; runtime paths contain their package version, and the seed filename contains its SHA-256 prefix. Asset SHA-256 hashes and byte sizes are in `public/models/MANIFEST.json` and `public/runtime/MANIFEST.json`. There are no remote fallbacks.

Required production capabilities:

```text
script-src 'self' 'wasm-unsafe-eval'
connect-src 'self'
worker-src 'self' blob:
```

The host must serve `.mjs` as JavaScript, `.wasm` as `application/wasm`, and permit the tool's dynamic style properties (the included test server uses `style-src 'self' 'unsafe-inline'`). No general JavaScript `unsafe-eval`, inline scripts, or third-party connections are needed. Vite bundles the small module worker; the official model runtime is loaded from `assetBase` on tool mount.

## Verification and licensing

Node tests cover whole-ID navigation, embedding math, exact word ranking, deterministic PCA, genuine cached vector shape/norm/parity, and import validation. Browser tests use actual local model assets with the production CSP and cover arbitrary fresh queries, a newly added note found semantically, model errors/retry/cancel, delayed requests/file reads, safe markup import, JSON export, keyboard interaction, same-query comparisons, unrelated queries, direct ID lookup without embedding requests, startup warmup offscreen/queue/disposal races, seed-fetch retry, and 390px layout. Tests do not mock successful embeddings.

The authored implementation and notes are MIT licensed. The pretrained model and Transformers.js are Apache-2.0; ONNX Runtime is MIT with included third-party notices. See `THIRD_PARTY_NOTICES.md` and the license files under `public/`.
