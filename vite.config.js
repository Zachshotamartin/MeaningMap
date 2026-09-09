import { defineConfig } from "vite";
export default defineConfig({
  worker: { format: "es" },
  server: { port: 5182, strictPort: true },
  build: { target: "es2022" },
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
});
