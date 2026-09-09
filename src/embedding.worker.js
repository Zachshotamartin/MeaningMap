import { MODEL } from "./data/collections.js";
import { project } from "./math.js";
let extractor;
self.onmessage = async ({ data: { id, type, texts, assetBase } }) => {
  try {
    if (type === "project")
      return self.postMessage({ id, type: "result", points: project(texts) });
    if (!extractor) {
      const { pipeline, env } = await import(
        /* @vite-ignore */ new URL(
          "runtime/transformers-3.8.1.min.js",
          assetBase,
        ).href
      );
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.localModelPath = new URL(
        "models/751bff37182d3f1213fa05d7196b954e230abad9/",
        assetBase,
      ).href;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.wasmPaths = {
        wasm: new URL(
          "runtime/onnx-1.22.0-dev-89f8206ba4/ort-wasm-simd-threaded.wasm",
          assetBase,
        ).href,
        mjs: new URL(
          "runtime/onnx-1.22.0-dev-89f8206ba4/ort-wasm-simd-threaded.mjs",
          assetBase,
        ).href,
      };
      extractor = await pipeline("feature-extraction", MODEL, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (p) =>
          self.postMessage({ id, type: "progress", progress: p }),
      });
    }
    if (type === "load")
      return self.postMessage({ id, type: "result", loaded: true });
    const embeddings = [];
    for (let i = 0; i < texts.length; i++) {
      const result = await extractor(texts[i], {
        pooling: "mean",
        normalize: true,
      });
      embeddings.push(result.tolist()[0]);
      self.postMessage({
        id,
        type: "progress",
        progress: {
          status: "embedding",
          completed: i + 1,
          total: texts.length,
        },
      });
    }
    self.postMessage({
      id,
      type: "result",
      embeddings,
      points: type === "collection" ? project(embeddings) : undefined,
    });
  } catch (error) {
    extractor = null;
    self.postMessage({
      id,
      type: "error",
      message: error?.message || "The local model could not run.",
    });
  }
};
