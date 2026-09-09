# Retrieval evaluation, September 2026

The shipped encoder remains **MiniLM**. A larger model did not improve this collection's paraphrase retrieval, and would add about 11 MB to the model download. The product changes instead make saved text easier to inspect, compare semantic and literal rankings for the same query, and route complete note IDs directly.

## Protocol

The 80 original note texts and 64 new query/relevance labels were frozen by SHA-256 before measuring MiniLM and BGE. E5 was added as a candidate after BGE tied MiniLM, before measuring E5; the questions, labels, corpus and scoring rules remained fixed. `preregistration-v2.json` records this sequence and the hashes. `compare-models.mjs` refuses to run if either frozen input changes. There was no encoder training, parameter tuning, corpus rewriting, query relabeling, or fitted score threshold.

This is an authored diagnostic, not a third-party or broad independent benchmark. Queries were written separately from the six canned examples, but deliberately cover the existing notes. Strong results here do not establish general search accuracy. Three related compact English encoders are a limited comparison, not an exhaustive model search.

The set contains 44 paraphrase/synonym queries, four exact note titles, four exact note IDs, and twelve questions with no relevant note. Each query searches its assigned 40-note collection. Relevant IDs were declared in advance; Hit@k checks whether any declared relevant note appears within k results. Mean reciprocal rank uses the first relevant rank. No-answer queries are excluded from these metrics and reported separately. Literal results with zero word overlap are excluded, matching the UI.

## Actual results

| Encoder (q8)   | Paraphrase Hit@1 | Paraphrase Hit@3 | All 52 answerable Hit@1 | All 52 answerable Hit@3 | Model files, decimal MB |
| -------------- | ---------------: | ---------------: | ----------------------: | ----------------------: | ----------------------: |
| MiniLM L6      |   37/44 (84.09%) |   42/44 (95.45%) |          41/52 (78.85%) |          46/52 (88.46%) |                  23.685 |
| BGE-small v1.5 |   37/44 (84.09%) |   42/44 (95.45%) |          41/52 (78.85%) |          46/52 (88.46%) |                  34.727 |
| E5-small v2    |   37/44 (84.09%) |   40/44 (90.91%) |          41/52 (78.85%) |          44/52 (84.62%) |                  34.727 |

The literal overlap baseline returns the relevant note first in 25/52 cases (48.08%) and in its first three in 34/52 (65.38%). All three encoders miss the four exact-ID queries because IDs are not meaningful sentences and are deliberately absent from note embedding input.

Whole-ID lookup is now explicit navigation in the app. With this rule, MiniLM returns the right note first in 45/52 cases (86.54%) and within three in 50/52 (96.15%). The four recovered ID cases are **not a semantic model improvement**. An ID result says `ID`, not an invented perfect cosine score, and needs no model download. Substrings do not trigger this route; exact case takes priority, otherwise a case-insensitive ID must be unique.

The JSON report includes every prediction, original relevance label, full first-relevant rank, cosine score, literal result, model revision, pooling/prefix choices, asset bytes and SHA-256 hashes. It also records Node CPU warm-query latency: useful for comparing candidates in this run, not a browser loading/performance promise. All three were measured on the same machine and process protocol.

## Failure analysis

MiniLM's seven paraphrase top-result failures are retained in the report:

| Query ID | Intended note                                     | Actual first result           | Relevant rank | Interpretation                                                                            |
| -------- | ------------------------------------------------- | ----------------------------- | ------------: | ----------------------------------------------------------------------------------------- |
| v2-08    | Seeds in envelopes                                | Diversity buys time           |             2 | Related plant-diversity concepts are easy to conflate.                                    |
| v2-10    | One clear window / The notification bargain       | Walking around a problem      |             2 | “Train of thought” and interruptions lose some specificity.                               |
| v2-27    | A draft is a safe place                           | Design with real sentences    |             2 | Writing matches, but the privacy intention is weaker.                                     |
| v2-29    | A receipt for change                              | Errors with directions        |             2 | Both concern submission feedback; success versus error is missed.                         |
| v2-31    | The whole task by keys                            | A worker takes the heavy part |             4 | Completing a task without a mouse is not resolved well enough.                            |
| v2-36    | Measure the useful thing / Watch the quiet moment | The missing participants      |             3 | Analytics ambiguity retrieves adjacent research concepts.                                 |
| v2-44    | A file is an interface                            | Errors with directions        |            23 | A serious miss: “take saved information to another application” does not retrieve export. |

The candidate models trade different errors rather than fixing these reliably. For example, BGE improves the mouse query to rank three but worsens submission feedback to rank eight. E5 places submission feedback at fourteen and loses additional top-three matches. The collection was not edited to repair these measured failures.

For the twelve unrelated questions, MiniLM's highest returned scores range from 0.058 to 0.242. The answerable distribution overlaps that range, including short identifiers. BGE and E5 have different absolute score ranges, so raw cosine values cannot be compared as calibrated confidence across models. No threshold was fitted to make these twelve questions disappear. The UI clearly limits the search to the chosen notes, shows original saved text, and never fabricates an answer or claims its cosine is a probability. A future abstention rule would need separate validation data and a documented cost for rejecting genuinely relevant notes.

## Reproduce

```sh
npm ci
npm run evaluate:compare
```

Requires Node >=22. The first run downloads the two candidate q8 encoders from their pinned Hugging Face revisions into ignored `.cache/comparison-models/` (about 69 MB combined). MiniLM uses the shipped files under `public/models/`. Candidates are development-only, are not bundled or copied to the website, and make no browser requests. Reruns regenerate all note/query vectors and `evaluation/model-comparison-v2.json`. No API key is needed. The legacy 16-query evaluation remains available as `npm run evaluate` and is not combined with this set.

## Model authors' instructions and licenses

- [MiniLM official model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2): mean pooling and normalized sentence embeddings; Apache-2.0. Shipped ONNX conversion: `Xenova/all-MiniLM-L6-v2`, revision `751bff37182d3f1213fa05d7196b954e230abad9`.
- [BGE-small-en-v1.5 official model card](https://huggingface.co/BAAI/bge-small-en-v1.5): CLS/first-token pooling, normalization, and retrieval query instruction `Represent this sentence for searching relevant passages: `; no passage prefix. MIT. ONNX conversion: `Xenova/bge-small-en-v1.5`, revision `ea104dacec62c0de699686887e3f920caeb4f3e3`.
- [E5-small-v2 official model card](https://huggingface.co/intfloat/e5-small-v2): mean pooling and normalization, `query: ` and `passage: ` prefixes. MIT. ONNX conversion: `Xenova/e5-small-v2`, revision `02af79985278377e65c724a76275707cb0333c70`.

The official BGE author's CLS pooling instructions take precedence over the generic mean-pooling snippet on the conversion card. The report records each actual configuration so this detail can be reviewed.
