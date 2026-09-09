import { test, expect } from "@playwright/test";
const status = (p) => p.locator("[data-ui=status]");
const query = (p) => p.locator("[data-ui=query]");
const submit = (p) =>
  p.getByRole("button", { name: "Find connections", exact: true }).click();
const modelReady = (p) =>
  expect(p.locator("[data-ui=model-state]")).toHaveText("Ready", {
    timeout: 90000,
  });
const notesReady = (p) => expect(p.locator(".mm-node")).toHaveCount(60);
const editor = (p) => p.locator(".mm-collection-editor > summary").click();

test("map is primary and visible, four examples work, automatic warmup counts no inference, and keyboard/export remain usable", async ({
  page,
}) => {
  const modelRequests = [];
  page.on("request", (r) => {
    if (/\/models\//.test(r.url())) modelRequests.push(r.url());
  });
  await page.goto("/");
  await notesReady(page);
  await expect(page.locator(".mm-map")).toBeVisible();
  await expect(page.locator(".mm-map-section")).not.toHaveJSProperty(
    "tagName",
    "DETAILS",
  );
  await expect(page.locator(".mm-example")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Load local model" }),
  ).toHaveCount(0);
  await modelReady(page);
  expect(modelRequests.length).toBeGreaterThan(0);
  await expect(page.locator("[data-ui=request-count]")).toHaveText("0");
  await expect(page.locator("[data-ui=query-time]")).toHaveText("Not run yet");
  await expect(page.locator(".mm-detail h3")).toHaveText("The white roof");
  await expect(page.locator(".mm-comparison")).not.toHaveAttribute("open", "");
  await page
    .getByRole("button", { name: "Borrow instead of buy", exact: true })
    .click();
  await expect(page.locator(".mm-detail h3")).toHaveText("Borrow a drill");
  await page.locator(".mm-node[aria-pressed=true]").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".mm-node:focus")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Fit map", exact: true }).click();
  await page.locator("[data-ui=collection]").selectOption("studio-notebook");
  await notesReady(page);
  await page
    .getByRole("button", { name: "Navigate by listening", exact: true })
    .click();
  await expect(page.locator(".mm-detail h3")).toHaveText(
    "The spoken interface",
  );
  await editor(page);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export collection (.json)" }).click();
  const file = await pending;
  const { readFile } = await import("node:fs/promises");
  const exported = JSON.parse(await readFile(await file.path(), "utf8"));
  expect(exported.notes).toHaveLength(60);
  expect(exported.version).toBe(1);
});

test("actual fresh inference and new pasted note run locally under production CSP", async ({
  page,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:5282") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await notesReady(page);
  await query(page).fill(
    "Protect people from hot summer afternoons using trees and shade.",
  );
  await submit(page);
  await expect(status(page)).toContainText("Search complete", {
    timeout: 90000,
  });
  await expect(page.locator(".mm-result").first()).toContainText(
    "Shade is infrastructure",
  );
  await expect(page.locator("[data-ui=request-count]")).toHaveText("1");
  await editor(page);
  await page.getByLabel("Title", { exact: true }).fill("Bottle-fed balcony");
  await page
    .getByLabel("Note", { exact: true })
    .fill(
      "An inverted water bottle with a tiny outlet slowly irrigates balcony tomatoes while their gardener is away on vacation. Test the flow before leaving home.",
    );
  await page.getByRole("button", { name: "Embed & add note" }).click();
  await expect(status(page)).toContainText("Note embedded and added");
  await expect(page.locator(".mm-node")).toHaveCount(61);
  await expect(page.locator("[data-ui=note-count]")).toHaveText("1");
  await query(page).fill("Keep my tomato plants watered during a trip.");
  await submit(page);
  await expect(status(page)).toContainText("Search complete");
  await expect(page.locator(".mm-result").first()).toContainText(
    "Bottle-fed balcony",
  );
  await expect(page.locator("[data-ui=request-count]")).toHaveText("3");
  await expect(page.locator("[data-ui=query-time]")).toHaveText(
    /^\d+(\.\d+)? (ms|s)$/,
  );
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("initial offscreen warmup continues and the latest queued query wins", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.IntersectionObserver = class {
      constructor(fn) {
        this.fn = fn;
      }
      observe(target) {
        window.deliverVisibility = (states) =>
          this.fn(states.map((isIntersecting) => ({ target, isIntersecting })));
      }
      disconnect() {}
    };
  });
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route("**/models/**", async (route) => {
    await held;
    await route.continue().catch(() => {});
  });
  await page.goto("/");
  await notesReady(page);
  await expect(page.locator("[data-ui=model-state]")).toHaveText("Loading");
  await page.evaluate(() => {
    window.deliverVisibility([false, true]);
    window.deliverVisibility([false]);
    window.deliverVisibility([]);
  });
  await query(page).fill(
    "Keep copies of family photographs away from the house.",
  );
  await submit(page);
  await query(page).fill(
    "Protect people from hot summer afternoons using trees and shade.",
  );
  await submit(page);
  await expect(page.locator("[data-ui=request-count]")).toHaveText("0");
  release();
  await expect(status(page)).toContainText("Search complete", {
    timeout: 90000,
  });
  await expect(page.locator(".mm-result").first()).toContainText(
    "Shade is infrastructure",
  );
  await expect(page.locator("[data-ui=request-count]")).toHaveText("1");
});

test("automatic model failure offers retry, preserves map, and recovers without a manual load button", async ({
  page,
}) => {
  await page.route("**/models/**", (route) => route.abort());
  await page.goto("/");
  await notesReady(page);
  await expect(status(page)).toContainText("Could not complete", {
    timeout: 60000,
  });
  await expect(page.locator("[data-ui=model-state]")).toHaveText("Error");
  await expect(page.locator("[data-ui=request-count]")).toHaveText("0");
  await page.unroute("**/models/**");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await modelReady(page);
  await expect(page.locator("[data-ui=request-count]")).toHaveText("0");
  await query(page).fill("A pedestrian needs a place to wait in the shade.");
  await submit(page);
  await expect(status(page)).toContainText("Search complete");
});

test("cancellation and disposal stop warmup; cached example supersedes a waiting query", async ({
  page,
}) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route("**/models/**", async (route) => {
    await held;
    await route.continue().catch(() => {});
  });
  await page.goto("/");
  await notesReady(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("[data-ui=model-state]")).toHaveText("Not loaded");
  await query(page).fill("A different idea waiting for the model");
  await submit(page);
  await page
    .getByRole("button", { name: "Borrow instead of buy", exact: true })
    .click();
  release();
  await modelReady(page);
  await expect(query(page)).toHaveValue("Borrow instead of buy");
  await expect(page.locator(".mm-detail h3")).toHaveText("Borrow a drill");
  await expect(page.locator("[data-ui=request-count]")).toHaveText("0");
  await page.evaluate(() => window.experiment.dispose());
  await expect(page.locator(".meaning-map")).toHaveCount(0);
});

test("disposing during held warmup aborts worker and seed work with no late UI", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route("**/models/**", async (route) => {
    await held;
    await route.continue().catch(() => {});
  });
  await page.goto("/");
  await notesReady(page);
  await page.evaluate(() => window.experiment.dispose());
  release();
  await page.waitForTimeout(100);
  await expect(page.locator(".meaning-map")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("seed fetch error retries without rendering a broken collection", async ({
  page,
}) => {
  await page.route("**/data/meaning-notes-v2-*.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await modelReady(page);
  await expect(status(page)).toContainText("Could not load the notes");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mm-node")).toHaveCount(0);
  await page.unroute("**/data/meaning-notes-v2-*.json");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await notesReady(page);
  await expect(page.locator(".mm-detail h3")).toHaveText("The white roof");
});

test("model failure before a delayed seed remains actionable after notes arrive", async ({
  page,
}) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route("**/data/meaning-notes-v2-*.json", async (route) => {
    await held;
    await route.continue();
  });
  await page.route("**/models/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("[data-ui=model-state]")).toHaveText("Error", {
    timeout: 60000,
  });
  release();
  await notesReady(page);
  await expect(status(page)).toContainText("Could not complete");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await page.unroute("**/models/**");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await modelReady(page);
});

test("import validation, safe text, exportable collection and delayed file race", async ({
  page,
}) => {
  await page.goto("/");
  await notesReady(page);
  await modelReady(page);
  await editor(page);
  await page
    .locator("[data-ui=import]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":8,"notes":[]}'),
    });
  await expect(status(page)).toContainText("Could not complete");
  await notesReady(page);
  const data = {
    version: 1,
    title: "My notes",
    notes: [
      {
        id: "a",
        title: "<img src=x onerror=alert(1)>",
        text: "A small ferry connects two shores across a bay.",
        group: "Water",
      },
      {
        id: "b",
        title: "Train journey",
        text: "Rail tracks carry passengers between inland towns.",
        group: "Travel",
      },
    ],
  };
  await page
    .locator("[data-ui=import]")
    .setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  await expect(status(page)).toContainText("Imported 2 notes");
  await expect(page.locator(".mm-node")).toHaveCount(2);
  await expect(page.locator(".mm-detail")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator(".meaning-map img")).toHaveCount(0);
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return original.call(this);
    };
  });
  await page
    .locator("[data-ui=import]")
    .setInputFiles({
      name: "slow.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  await page
    .getByRole("button", { name: "Reset to preset", exact: true })
    .click();
  await page.waitForTimeout(450);
  await notesReady(page);
});

test("keyword, exact IDs, optional comparison and no-match browsing remain honest", async ({
  page,
}) => {
  await page.goto("/");
  await notesReady(page);
  await modelReady(page);
  await query(page).fill(" F26 ");
  await submit(page);
  await expect(page.locator(".mm-result .mm-score")).toHaveText("ID");
  await expect(page.locator("[data-ui=request-count]")).toHaveText("0");
  await page.getByRole("button", { name: "Keyword", exact: true }).click();
  await query(page).fill("quasarquasarquasar");
  await submit(page);
  await expect(page.locator(".mm-detail h3")).toHaveText("No literal matches");
  await expect(page.locator("[data-ui=result-count]")).toHaveText("0 matches");
  await editor(page);
  await page.locator(".mm-corpus > summary").click();
  await page.locator('.mm-corpus-note[data-index="8"]').click();
  await expect(page.locator(".mm-detail h3")).toHaveText("Borrow a drill");
  await query(page).fill("What is the capital of Peru?");
  await submit(page);
  await page.locator(".mm-comparison > summary").click();
  await page
    .getByRole("button", { name: "Compare by meaning", exact: true })
    .click();
  await expect(status(page)).toContainText("Search complete");
  await expect(page.locator(".mm-detail .mm-eyebrow")).toContainText(
    "SAVED NOTE",
  );
  await expect(page.locator(".mm-score-note")).toContainText("not confidence");
  await expect(page.locator("[data-ui=request-count]")).toHaveText("1");
});

test("390px layout keeps map visible and controls inside viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await notesReady(page);
  await expect(page.locator(".mm-map")).toBeVisible();
  await expect(page.locator(".mm-node-label.is-selected")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= 390),
  ).toBeTruthy();
  await query(page).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Find connections", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Fit map", exact: true }).click();
});
