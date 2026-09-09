import { chromium } from "@playwright/test";
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
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
async function capture(name) {
  await page.locator(".mm-node").first().waitFor();
  const clip = await page.evaluate(() => {
    const root = document.querySelector(".meaning-map").getBoundingClientRect(),
      work = document.querySelector(".mm-workspace").getBoundingClientRect();
    return {
      x: root.x,
      y: root.y,
      width: root.width,
      height: work.bottom - root.y + 8,
    };
  });
  await page.screenshot({ path: `examples/${name}.png`, clip });
  console.log(
    `Captured ${name}: ${Math.round(clip.width)} × ${Math.round(clip.height)}`,
  );
}
try {
  await page.goto(base);
  await capture("meaning-map-cooler-city");
  await page.locator("[data-ui=collection]").selectOption("studio-notebook");
  await page
    .getByRole("button", {
      name: "An interface someone can navigate by listening.",
      exact: true,
    })
    .click();
  await capture("meaning-map-accessible-studio");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "examples/mobile-390.png", fullPage: true });
} finally {
  await browser.close();
  server?.kill();
}
