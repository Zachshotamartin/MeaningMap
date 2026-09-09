import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const base = resolve("dist");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".png": "image/png",
  ".webp": "image/webp",
};
const csp =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'";
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let file = resolve(base, "." + decodeURIComponent(url.pathname));
      if (file !== base && !file.startsWith(base + sep)) {
        res.writeHead(403);
        return res.end();
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Content-Length": data.length,
        "Content-Security-Policy": csp,
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(5282, "127.0.0.1", () =>
    console.log("Production CSP server http://127.0.0.1:5282"),
  );
