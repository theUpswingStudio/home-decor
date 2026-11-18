import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { test, createTestJpeg, prepareConsultation } from "./helpers/ai-consultation";
import { startConsultationStream } from "./helpers/consultation-stream";

for (const clearFails of [false, true]) {
  test(`reset clear ${clearFails ? "failure" : "completion"} stays visible after revising a new draft`, async ({ page }) => {
    const image = await createTestJpeg(page);
    await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({
      status: 503, json: { error: "Preview unavailable." },
    }));
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Preview unavailable");
    await page.evaluate((clearFails) => {
      const scope = window as typeof window & { releaseDesignClear?: () => void };
      const clear = IDBObjectStore.prototype.clear;
      IDBObjectStore.prototype.clear = function () {
        const transaction = this.transaction;
        transaction.addEventListener("complete", (event) => {
          event.stopImmediatePropagation();
          scope.releaseDesignClear = () => transaction.dispatchEvent(new Event("complete"));
        }, { once: true });
        return clear.call(this);
      };
      if (clearFails) {
        const removeItem = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function (key) {
          if (key === "vestrel-house:ai-consultation:latest:v3") throw new Error("Saved data could not be cleared");
          return removeItem.call(this, key);
        };
      }
    }, clearFails);
    try {
      await page.getByRole("button", { name: "Start over", exact: true }).click();
      await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
      await page.waitForFunction(() => Boolean((window as typeof window & { releaseDesignClear?: () => void }).releaseDesignClear));
      await expect(page.getByText("Clearing saved design…")).toBeVisible();
      await page.locator('input[type="file"]').setInputFiles({
        name: "new-room.jpg", mimeType: "image/jpeg", buffer: image,
      });
      await expect(page.getByLabel("Guided room intake").getByText("new-room.jpg")).toBeVisible();
      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: "Continue", exact: true }).click();
      }
      await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
      await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Preview unavailable");
      await page.getByRole("button", { name: "Revise brief", exact: true }).click();
      await expect(page.getByLabel("Guided room intake")).toBeVisible();
      await page.evaluate(() => (window as typeof window & { releaseDesignClear?: () => void }).releaseDesignClear?.());
      await expect(page.getByText("Clearing saved design…")).not.toBeVisible();
      const warning = page.getByText("The design was cleared from this page, but saved data could not be removed.");
      if (clearFails) await expect(warning).toBeVisible();
      else await expect(warning).toHaveCount(0);
    } finally {
      await page.evaluate(() => (window as typeof window & { releaseDesignClear?: () => void }).releaseDesignClear?.());
    }
  });
}

test("reset confirmation preserves analysis and stays open through completion", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    requests += 1;
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({ status: 503, json: { error: "Preview unavailable." } }));
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect.poll(() => requests).toBe(1);
    const start = page.getByRole("button", { name: "Start over", exact: true });
    await start.click();
    const dialog = page.getByRole("dialog", { name: "Start over?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Keep working" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(start).toBeFocused();
    await expect(page.getByRole("heading", { name: "Creating your room design" })).toBeVisible();
    await start.click();
    await dialog.getByRole("button", { name: "Keep working" }).click();
    await expect(start).toBeFocused();
    await start.click();
    release();
    await expect(page.getByRole("heading", { name: "Catalog recommendations", includeHidden: true })).toBeAttached();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Work already sent to the provider may continue.");
    await expect(dialog.getByRole("button", { name: "Keep working" })).toBeFocused();
    await dialog.getByRole("button", { name: "Clear and start over" }).click();
    await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeFocused();
    await expect(page.getByText("Clearing saved design…")).not.toBeVisible();
    expect(requests).toBe(1);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
    await expect(page.getByText("living-room.png", { exact: true })).toHaveCount(0);
  } finally { release(); }
});

test("analysis deadline unlocks the brief even when image conversion ignores abort", async ({ page }) => {
  const image = await createTestJpeg(page);
  await prepareConsultation(page, image);
  await page.evaluate(() => { FileReader.prototype.readAsDataURL = () => undefined; });
  await page.clock.install();
  await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
  await page.clock.fastForward(120_001);
  await expect(page.getByRole("region", { name: "Design workspace" })).toContainText("The room analysis took too long. Your answers are still available.");
  await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeEnabled();
});

test("preview deadline retains recommendations and unlocks revision", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/ai/consultation/preview", async (route) => {
    await gate;
    await route.fulfill({ status: 500, json: { error: "Late preview error" } });
  });
  try {
    await prepareConsultation(page, image);
    await page.clock.install();
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();
    await page.clock.fastForward(210_001);
    await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeEnabled();
    await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Your preview did not finish");
  } finally { release(); }
});

test("confirmed reset stops genuine partial chat and rejects old chunks", async ({ page }) => {
  const image = await createTestJpeg(page);
  const stream = await startConsultationStream(page);
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({ status: 503, json: { error: "Preview unavailable." } }));
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await page.getByRole("textbox", { name: "Message the design assistant" }).fill("Give me a room suggestion.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("A streamed room suggestion", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    const start = page.getByRole("button", { name: "Start over", exact: true });
    await start.click();
    const dialog = page.getByRole("dialog", { name: "Start over?" });
    await expect(dialog).toContainText("Work already sent to the provider may continue.");
    await page.keyboard.press("Escape");
    await expect(page.getByText("A streamed room suggestion", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    await start.click();
    await dialog.getByRole("button", { name: "Clear and start over" }).click();
    await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeFocused();
    await stream.disconnected();
    stream.release();
    await expect(page.getByText(/A streamed room suggestion/)).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Message the design assistant" })).toHaveCount(0);
    expect(stream.requests()).toBe(1);
    await expect(page.getByText("Clearing saved design…")).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
  } finally { await stream.close(); }
});

test("late preview error body cannot overwrite a reset draft", async ({ page }) => {
  const image = await createTestJpeg(page);
  const stream = await startConsultationStream(page, { target: "preview-error", ignoreAbort: true });
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await stream.firstChunk;
    await stream.bodyStarted();
    await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();
    const start = page.getByRole("button", { name: "Start over", exact: true });
    await start.click();
    await page.getByRole("button", { name: "Keep working", exact: true }).click();
    await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();
    expect(stream.requests()).toBe(1);
    await start.click();
    await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeFocused();
    await page.locator('input[type="file"]').setInputFiles({ name: "new-room.jpg", mimeType: "image/jpeg", buffer: image });
    await expect(page.getByLabel("Guided room intake").getByText("new-room.jpg")).toBeVisible();
    stream.release();
    await stream.bodyRead();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Step 2 persists after the old body resolves. Its preview must still be idle.
    await expect.poll(() => page.evaluate(() => new Promise<{ step?: number; status?: string }>((resolve, reject) => {
      const open = indexedDB.open("vestrel-house-ai-consultation", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("consultations", "readonly");
        const id = localStorage.getItem("vestrel-house:ai-consultation:latest:v3");
        const get = tx.objectStore("consultations").get(id ?? "");
        get.onsuccess = () => resolve({ step: get.result?.step, status: get.result?.preview.status });
        tx.oncomplete = () => db.close();
      };
    }))).toEqual({ step: 2, status: "idle" });
    await expect(page.getByText("Obsolete preview failure", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "Design workspace" })).toHaveCount(0);
    await expect(page.getByText("living-room.png", { exact: true })).toHaveCount(0);
  } finally { await stream.close(); }
});

test("storage clear failure reports a warning without blocking the blank draft", async ({ page }) => {
  const image = await createTestJpeg(page);
  await prepareConsultation(page, image);
  await page.evaluate(() => { IDBObjectStore.prototype.clear = () => { throw new Error("Storage blocked"); }; });
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeFocused();
  await expect(page.getByText("The design was cleared from this page, but saved data could not be removed.", { exact: true })).toBeVisible();
  await expect(page.getByText("Stored in memory", { exact: true })).toBeVisible();
});

test("initial handshake has a deadline even when fetch ignores cancellation", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, init) => String(input).includes("/api/ai/session")
      ? new Promise<Response>(() => undefined) : original(input, init);
  });
  await page.clock.install();
  await page.goto("/ai-consultation");
  await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
  await page.clock.fastForward(20_001);
  await expect(page.getByText("The protected design session took too long to start. Try again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry protected session" })).toBeEnabled();
});

for (const attempt of [1, 2] as const) {
  test(`restores interrupted preview attempt ${attempt} with truthful retry copy`, async ({ page }) => {
    const image = await createTestJpeg(page);
    let previews = 0;
    await page.route("**/api/ai/consultation/preview", (route) => {
      previews += 1;
      return route.fulfill({ status: 500, json: { error: "Preview stopped." } });
    });
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("vestrel-house:ai-consultation:latest:v3"))).not.toBeNull();
    await expect.poll(() => page.evaluate(() => new Promise<string>((resolve, reject) => {
      const open = indexedDB.open("vestrel-house-ai-consultation", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("consultations", "readonly");
        const get = tx.objectStore("consultations").get(localStorage.getItem("vestrel-house:ai-consultation:latest:v3")!);
        get.onsuccess = () => resolve(get.result?.preview.status ?? "");
        tx.oncomplete = () => db.close();
      };
    }))).toBe("error");
    await page.evaluate((attempt) => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("vestrel-house-ai-consultation", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("consultations", "readwrite");
        const store = tx.objectStore("consultations");
        const get = store.get(localStorage.getItem("vestrel-house:ai-consultation:latest:v3")!);
        get.onsuccess = () => store.put({ ...get.result, preview: { ...get.result.preview, status: "rendering", attempt } });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    }), attempt);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await expect(page.getByText(attempt === 1
      ? "The previous image render was interrupted. Use your retry to continue."
      : "The previous image render was interrupted. Your preview retry is already used. Your recommendations are still available.", { exact: true })).toBeVisible();
    if (attempt === 2) await expect(page.getByRole("button", { name: /Retry.*preview/i })).toHaveCount(0);
    expect(previews).toBe(1);
  });
}

test("a room upload callback from before reset cannot restore the discarded photo", async ({ page }) => {
  const image = await createTestJpeg(page);
  await prepareConsultation(page, image);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.evaluate(() => {
    const scope = window as typeof window & { releaseImage?: () => void };
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      original.call(this, (blob) => { scope.releaseImage = () => callback(blob); }, ...args);
    };
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "discarded-upload.jpg", mimeType: "image/jpeg", buffer: image });
  await page.waitForFunction(() => Boolean((window as typeof window & { releaseImage?: () => void }).releaseImage));
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
  await page.evaluate(() => (window as typeof window & { releaseImage?: () => void }).releaseImage?.());
  await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
  await expect(page.getByText("discarded-upload.jpg", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Clearing saved design…")).not.toBeVisible();
  await page.reload();
  await expect(page.getByText("discarded-upload.jpg", { exact: true })).toHaveCount(0);
});

test("late credential renewal after reset cannot retry analysis or replace the current token", async ({ page }) => {
  const image = await createTestJpeg(page);
  await page.addInitScript(() => {
    const scope = window as typeof window & { releaseRenewal?: () => void };
    const original = window.fetch;
    let sessions = 0;
    window.fetch = (input, init) => {
      if (String(input).includes("/api/ai/session") && ++sessions === 2) {
        return new Promise<Response>((resolve) => {
          scope.releaseRenewal = () => resolve(Response.json({ csrfToken: "obsolete-token", previewAvailable: true }));
        });
      }
      return original(input, init);
    };
  });
  let analyses = 0;
  let lastCsrf = "";
  await page.route("**/api/ai/consultation", async (route) => {
    analyses += 1;
    lastCsrf = route.request().headers()["x-ai-csrf"];
    if (analyses === 1) await route.fulfill({ status: 401, json: { error: "Expired" } });
    else await route.continue();
  });
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({ status: 503, json: { error: "Preview unavailable." } }));
  await prepareConsultation(page, image);
  await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
  await page.waitForFunction(() => Boolean((window as typeof window & { releaseRenewal?: () => void }).releaseRenewal));
  const originalToken = lastCsrf;
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
  await page.evaluate(() => (window as typeof window & { releaseRenewal?: () => void }).releaseRenewal?.());
  await page.locator('input[type="file"]').setInputFiles({ name: "new-room.jpg", mimeType: "image/jpeg", buffer: image });
  await expect(page.getByLabel("Guided room intake").getByText("new-room.jpg")).toBeVisible();
  for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect(analyses).toBe(1);
  await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
  expect(analyses).toBe(2);
  expect(lastCsrf).toBe(originalToken);
});

test("a timed-out renewal cannot clear newer credentials or retry old analysis", async ({ page }) => {
  const image = await createTestJpeg(page);
  await page.addInitScript(() => {
    const scope = window as typeof window & { releaseOldRefresh?: () => void; renewals?: number };
    const original = window.fetch;
    let sessions = 0;
    window.fetch = (input, init) => {
      if (String(input).includes("/api/ai/session")) {
        scope.renewals = ++sessions;
        if (sessions === 2) return new Promise<Response>((resolve) => {
          scope.releaseOldRefresh = () => resolve(Response.json({ error: "Obsolete refresh failure" }, { status: 500 }));
        });
      }
      return original(input, init);
    };
  });
  let analyses = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    analyses += 1;
    if (analyses === 1) await route.fulfill({ status: 401, json: { error: "Expired" } });
    else await route.continue();
  });
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({ status: 503, json: { error: "Preview unavailable." } }));
  await prepareConsultation(page, image);
  await page.clock.install();
  await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
  await page.waitForFunction(() => Boolean((window as typeof window & { releaseOldRefresh?: () => void }).releaseOldRefresh));
  await page.clock.fastForward(20_001);
  await expect(page.getByRole("button", { name: "Retry protected session" })).toBeVisible();
  await page.getByRole("button", { name: "Retry protected session" }).click();
  await expect(page.getByRole("button", { name: "Retry protected session" })).toHaveCount(0);
  await page.evaluate(() => (window as typeof window & { releaseOldRefresh?: () => void }).releaseOldRefresh?.());
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
  await expect(page.getByText("Obsolete refresh failure", { exact: true })).toHaveCount(0);
  expect(analyses).toBe(2);
  expect(await page.evaluate(() => (window as typeof window & { renewals?: number }).renewals)).toBe(3);
});

test("reset cancels a debounced old save before clearing the stored design", async ({ page }) => {
  const image = await createTestJpeg(page);
  await prepareConsultation(page, image);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("vestrel-house:ai-consultation:latest:v3"))).not.toBeNull();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByLabel("Anything to keep, avoid, or plan around?").fill("Discard these pending notes.");
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
  await expect(page.getByText("Clearing saved design…")).not.toBeVisible();
  await page.clock.fastForward(100);
  expect(await page.evaluate(() => localStorage.getItem("vestrel-house:ai-consultation:latest:v3"))).toBeNull();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
  await expect(page.getByText("living-room.png", { exact: true })).toHaveCount(0);
});

test("reset dialog keeps keyboard focus and fits 320 pixels with reduced motion", async ({ page }) => {
  const image = await createTestJpeg(page);
  await prepareConsultation(page, image);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Start over?" });
  const keep = dialog.getByRole("button", { name: "Keep working" });
  await expect(keep).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Clear and start over" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(keep).toBeFocused();
  // Native modal dialogs make the page inert; browser chrome remains reachable.
  await page.getByRole("button", { name: "Start over", exact: true, includeHidden: true }).evaluate((button) => (button as HTMLButtonElement).focus());
  await expect(keep).toBeFocused();
  const dimensions = await dialog.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    left: element.getBoundingClientRect().left,
    scroll: element.scrollWidth,
    client: element.clientWidth,
  }));
  expect(dimensions.left).toBeGreaterThanOrEqual(0);
  expect(dimensions.width).toBeLessThanOrEqual(320);
  expect(dimensions.scroll).toBe(dimensions.client);
  const accessibility = await new AxeBuilder({ page }).include("dialog").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Start over", exact: true })).toBeFocused();
});
