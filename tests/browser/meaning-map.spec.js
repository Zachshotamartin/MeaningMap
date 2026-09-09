import { test, expect } from "@playwright/test";
const status = (page) => page.locator("[data-ui=status]");
test("instant genuine presets, keyword contrast, map keys, and portable export", async ({
  page,
}) => {
  const modelRequests = [];
  page.on("request", (r) => {
    if (/\/models\/|\.wasm/.test(r.url())) modelRequests.push(r.url());
  });
  await page.goto("/");
  await expect(page.locator(".mm-node")).toHaveCount(40);
  await expect(page.locator('[data-ui="model-state"]')).toHaveText(
    "Not loaded",
  );
  await expect(page.locator('[data-ui="request-count"]')).toHaveText("0");
  await expect(page.locator('[data-ui="query-time"]')).toHaveText(
    "Not run yet",
  );
  await expect(page.locator(".mm-result").first()).toContainText(
    "The white roof",
  );
  await page.getByRole("button", { name: "Keyword", exact: true }).click();
  await expect(page.locator(".mm-ranking-info")).toContainText(
    "exact word overlap",
  );
  await page.getByRole("button", { name: "Semantic", exact: true }).click();
  await page.locator(".mm-node[aria-pressed=true]").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".mm-node:focus")).toHaveCount(1);
  await expect(page.locator(".mm-node:focus")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Fit map", exact: true }).click();
  await page.locator("[data-ui=collection]").selectOption("studio-notebook");
  await expect(page.locator(".mm-result").first()).toContainText(
    "A reversible first step",
  );
  expect(modelRequests).toEqual([]);
  await page.locator(".mm-collection-editor > summary").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export collection (.json)" }).click();
  const download = await downloadPromise;
  const fs = await import("node:fs/promises");
  const value = JSON.parse(await fs.readFile(await download.path(), "utf8"));
  expect(value.notes).toHaveLength(40);
  expect(value.version).toBe(1);
  expect(value.notes[0].title).toBe("A reversible first step");
});
test("actual WASM model handles a fresh query and a new pasted note under self-only CSP", async ({
  page,
}) => {
  const errors = [];
  const external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:5282") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await page
    .locator("[data-ui=query]")
    .fill("Protect people from hot summer afternoons using trees and shade.");
  await page.getByRole("button", { name: "Find connections" }).click();
  await expect(status(page)).toContainText("Search complete", {
    timeout: 90000,
  });
  await expect(page.locator(".mm-result").first()).toContainText(
    "Shade is infrastructure",
  );
  await expect(page.locator('[data-ui="model-state"]')).toHaveText("Ready");
  await expect(page.locator('[data-ui="request-count"]')).toHaveText("1");
  await expect(page.locator('[data-ui="note-count"]')).toHaveText("0");
  await expect(page.locator('[data-ui="query-time"]')).toHaveText(
    /^\d+(\.\d+)? (ms|s)$/,
  );
  await page.locator(".mm-collection-editor > summary").click();
  await page.getByLabel("Title", { exact: true }).fill("Bottle-fed balcony");
  await page
    .getByLabel("Note", { exact: true })
    .fill(
      "An inverted water bottle with a tiny outlet slowly irrigates balcony tomatoes while their gardener is away on vacation. Test the flow before leaving home.",
    );
  await page.getByRole("button", { name: "Embed & add note" }).click();
  await expect(status(page)).toContainText("Note embedded and added", {
    timeout: 60000,
  });
  await expect(page.locator(".mm-node")).toHaveCount(41);
  await expect(page.locator(".mm-detail")).toContainText("Bottle-fed balcony");
  await expect(page.locator('[data-ui="request-count"]')).toHaveText("2");
  await expect(page.locator('[data-ui="note-count"]')).toHaveText("1");
  await page
    .locator("[data-ui=query]")
    .fill("Keep my tomato plants watered during a trip.");
  await page.getByRole("button", { name: "Find connections" }).click();
  await expect(status(page)).toContainText("Search complete");
  await expect(page.locator(".mm-result").first()).toContainText(
    "Bottle-fed balcony",
  );
  await expect(page.locator('[data-ui="request-count"]')).toHaveText("3");
  await expect(page.locator('[data-ui="note-count"]')).toHaveText("1");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("model failure, retry, cancellation, and stale requests preserve data", async ({
  page,
}) => {
  await page.route("**/models/**", (route) => route.abort());
  await page.goto("/");
  await page
    .locator("[data-ui=query]")
    .fill("A fresh query that needs the model");
  await page.getByRole("button", { name: "Find connections" }).click();
  await expect(status(page)).toContainText("Could not complete", {
    timeout: 60000,
  });
  await expect(page.locator('[data-ui="model-state"]')).toHaveText("Error");
  await expect(page.locator('[data-ui="request-count"]')).toHaveText("0");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mm-node")).toHaveCount(40);
  await page.unroute("**/models/**");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(status(page)).toContainText("Search complete", {
    timeout: 90000,
  });
  await page.evaluate(() => window.experiment.dispose());
  await expect(page.locator(".meaning-map")).toHaveCount(0);
});
test("explicit cancel stops work and example supersedes pending fresh search", async ({
  page,
}) => {
  await page.route("**/models/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue().catch(() => {});
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Load local model", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(status(page)).toContainText("Cancelled");
  await expect(page.locator('[data-ui="model-state"]')).toHaveText(
    "Not loaded",
  );
  await expect(page.locator('[data-ui="request-count"]')).toHaveText("0");
  await page
    .locator("[data-ui=query]")
    .fill("A query waiting behind a download");
  await page.getByRole("button", { name: "Find connections" }).click();
  await page
    .getByRole("button", {
      name: "I keep interrupting myself before I finish anything.",
      exact: true,
    })
    .click();
  await expect(status(page)).toContainText("Precomputed example");
  await page.waitForTimeout(2000);
  await expect(page.locator("[data-ui=query]")).toHaveValue(
    "I keep interrupting myself before I finish anything.",
  );
  await expect(status(page)).toContainText("Precomputed example");
});
test("import rejects invalid data, embeds valid plain text, and safely renders markup", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".mm-collection-editor > summary").click();
  await page.locator("[data-ui=import]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":8,"notes":[]}'),
  });
  await expect(status(page)).toContainText("Could not complete");
  await expect(page.locator(".mm-node")).toHaveCount(40);
  const data = {
    version: 1,
    title: "Small safe collection",
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
  await page.locator("[data-ui=import]").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(status(page)).toContainText("Imported 2 notes", {
    timeout: 90000,
  });
  await expect(page.locator(".mm-node")).toHaveCount(2);
  await expect(page.locator(".mm-detail")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(page.locator(".meaning-map img")).toHaveCount(0);
});
test("390px mobile layout stays inside viewport and has usable keyboard controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= 390),
  ).toBeTruthy();
  await expect(page.locator(".mm-map")).toBeVisible();
  await page.locator("[data-ui=query]").focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Find connections" }),
  ).toBeFocused();
  await page.locator("[data-ui=collection]").selectOption("studio-notebook");
  await expect(page.locator(".mm-node")).toHaveCount(40);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Fit map", exact: true }).click();
  await page.screenshot({ path: "examples/mobile-390.png", fullPage: true });
});
test("a reset supersedes a slow file read without creating a stale collection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return original.call(this);
    };
  });
  await page.goto("/");
  await page.locator(".mm-collection-editor > summary").click();
  const value = {
    version: 1,
    title: "Late import",
    notes: [
      {
        id: "late",
        title: "Old state",
        text: "This import must not appear after reset.",
        group: "Test",
      },
    ],
  };
  await page.locator("[data-ui=import]").setInputFiles({
    name: "slow.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await page
    .getByRole("button", { name: "Reset to preset", exact: true })
    .click();
  await page.waitForTimeout(900);
  await expect(page.locator(".mm-node")).toHaveCount(40);
  await expect(page.locator("[data-ui=collection]")).toHaveValue("field-notes");
  await expect(status(page)).toContainText("Precomputed example");
});
test("fresh keyword search stays lightweight until semantic comparison is requested", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => {
    if (/\/models\/|\/runtime\//.test(r.url())) requests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Keyword", exact: true }).click();
  await page
    .locator("[data-ui=query]")
    .fill("A tree provides shade in summer.");
  await page.getByRole("button", { name: "Find connections" }).click();
  await expect(status(page)).toContainText("Keyword results ready");
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Semantic", exact: true }).click();
  await expect(status(page)).toContainText("Search complete", {
    timeout: 90000,
  });
  expect(requests.length).toBeGreaterThan(0);
  await expect(page.locator(".mm-result").first()).toContainText(
    "Shade is infrastructure",
  );
});

test("newest visible entry in a batched observer notification preserves a busy model request", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        window.deliverMeaningMapVisibility = (states) =>
          this.callback(
            states.map((isIntersecting, index) => ({
              target,
              isIntersecting,
              time: index,
            })),
            this,
          );
      }
      disconnect() {
        delete window.deliverMeaningMapVisibility;
      }
    };
  });
  let release;
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/models/**", async (route) => {
    await blocked;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/");
    await page
      .locator("[data-ui=query]")
      .fill("Protect people from hot summer afternoons using trees and shade.");
    await page.getByRole("button", { name: "Find connections" }).click();
    await expect(page.locator('[data-ui="model-state"]')).toHaveText("Loading");
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
    await page.evaluate(() =>
      window.deliverMeaningMapVisibility([false, true]),
    );
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
    await expect(status(page)).not.toContainText("Paused");
    await expect(page.locator('[data-ui="request-count"]')).toHaveText("0");
    await page.evaluate(() => window.deliverMeaningMapVisibility([]));
    release();
    await expect(status(page)).toContainText("Search complete", {
      timeout: 90000,
    });
    await expect(page.locator('[data-ui="model-state"]')).toHaveText("Ready");
    await expect(page.locator('[data-ui="request-count"]')).toHaveText("1");
    await expect(page.locator(".mm-result").first()).toContainText(
      "Shade is infrastructure",
    );
    // Conversely, a newest hidden entry must still cancel. Trigger both the
    // request and the callback in one task, before a worker result can arrive.
    await page.evaluate(() => {
      document.querySelector("[data-ui=query]").value =
        "A different fresh thought about shade.";
      document.querySelector(".mm-query-form").requestSubmit();
      window.deliverMeaningMapVisibility([true, false]);
    });
    await expect(status(page)).toContainText(
      "Paused while the experiment is off screen",
    );
    await expect(page.locator('[data-ui="model-state"]')).toHaveText(
      "Not loaded",
    );
    await expect(page.locator('[data-ui="request-count"]')).toHaveText("1");
  } finally {
    release();
  }
});
