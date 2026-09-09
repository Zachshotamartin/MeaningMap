import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
await mkdir("examples", { recursive: true });
const base = "http://127.0.0.1:5282";
let server;
try {
  await fetch(base);
} catch {
  server = spawn(process.execPath, ["scripts/serve.mjs"], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  await once(server.stdout, "data");
}
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1200 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
async function capture(name) {
  await page.locator(".mm-node").first().waitFor();
  const panel = page.locator(".mm-map-panel");
  const png = await panel.screenshot({ path: `examples/${name}.png` });
  console.log(
    `Captured ${name}: ${png.readUInt32BE(16)} × ${png.readUInt32BE(20)} map preview`,
  );
}
try {
  await page.goto(base);
  await capture("meaning-map-cooler-city");
  await page.locator("[data-ui=collection]").selectOption("studio-notebook");
  await page
    .locator("[data-ui=query]")
    .fill("An interface I can navigate by listening.");
  await page.getByRole("button", { name: "Find connections" }).click();
  await expect(page.locator("[data-ui=status]")).toContainText(
    "Search complete",
    { timeout: 90000 },
  );
  await expect(page.locator(".mm-detail")).toContainText(
    "The spoken interface",
  );
  await capture("meaning-map-accessible-studio");
  await page
    .locator(".mm-inference-stats")
    .screenshot({ path: "examples/meaning-map-inference-stats.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "examples/mobile-390.png", fullPage: true });
} finally {
  await browser.close();
  server?.kill();
}
