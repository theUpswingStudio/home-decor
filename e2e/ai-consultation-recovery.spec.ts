import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import type { SavedConsultationRecord } from "../src/lib/ai/consultation-storage";
import { test, createTestJpeg, prepareConsultation } from "./helpers/ai-consultation";

const unavailable = "Image preview is unavailable because OpenRouter is not configured.";

async function savedDesign(page: Page) {
  return page.evaluate(() => new Promise<{
    step: number; notes: string; fileName: string; hasResult: boolean;
    previewStatus: string; attempt: number; selectedProductIds: readonly string[];
  } | null>((resolve, reject) => {
    const id = localStorage.getItem("vestrel-house:ai-consultation:latest:v3");
    if (!id) { resolve(null); return; }
    const open = indexedDB.open("vestrel-house-ai-consultation", 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction("consultations", "readonly");
      const get = tx.objectStore("consultations").get(id);
      get.onerror = () => reject(get.error);
      get.onsuccess = () => {
        const record = get.result as SavedConsultationRecord | undefined;
        resolve(record ? {
          step: record.step, notes: record.intake.notes, fileName: record.room.fileName,
          hasResult: Boolean(record.result), previewStatus: record.preview.status,
          attempt: record.preview.attempt, selectedProductIds: record.selectedProductIds,
        } : null);
      };
      tx.oncomplete = () => db.close();
    };
  }));
}

function reviewInvestment(page: Page) {
  return page.getByRole("navigation", { name: "Review completed answers" })
    .getByRole("button", { name: "Set investment", exact: true });
}

test("analysis failure keeps selected review and retries one generation with one initial preview", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let analyses = 0;
  const previewAttempts: number[] = [];
  await page.route("**/api/ai/consultation", async (route) => {
    analyses += 1;
    if (analyses === 1) {
      await gate;
      await route.fulfill({ status: 500, json: { error: "The room analysis could not finish." } });
    } else {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.fulfill({ response });
    }
  });
  await page.route("**/api/ai/consultation/preview", (route) => {
    previewAttempts.push(route.request().postDataJSON().attempt);
    return route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
  });
  try {
    await prepareConsultation(page, image);
    await page.getByLabel("Anything to keep, avoid, or plan around?").fill("Keep the oak floor.");
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    const step = reviewInvestment(page);
    await step.click();
    const review = page.getByRole("region", { name: "Submitted answers" });
    const heading = review.getByRole("heading", { name: "Set investment", exact: true });
    await expect.poll(() => analyses).toBe(1);
    expect(previewAttempts).toEqual([]);
    release();
    await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Generation did not finish. Your answers are unchanged.");
    await expect(step).toHaveAttribute("aria-current", "step");
    await expect(heading).toBeFocused();
    await expect(review).toContainText("Keep the oak floor.");
    await page.getByRole("button", { name: "Back to generation", exact: true }).click();
    const design = page.getByRole("region", { name: "Design workspace" });
    await expect(design).toContainText("The room analysis could not finish.");
    await expect(design.getByRole("button", { name: "Revise brief", exact: true })).toBeEnabled();
    const retry = design.getByRole("button", { name: "Try again", exact: true });
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Your design is ready");
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    expect(analyses).toBe(2);
    expect(previewAttempts).toEqual([1]);
  } finally { release(); }
});

test("preview 429 preserves review, recommendations and chat, with only one retry", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const attempts: number[] = [];
  await page.route("**/api/ai/consultation/preview", async (route) => {
    attempts.push(route.request().postDataJSON().attempt);
    if (attempts.length === 1) await gate;
    await route.fulfill({ status: 429, json: { error: "Image rendering is busy. Use your retry in a moment." } });
  });
  try {
    await prepareConsultation(page, image);
    await page.getByLabel("Anything to keep, avoid, or plan around?").fill("Keep the oak floor.");
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect.poll(() => attempts).toEqual([1]);
    const step = reviewInvestment(page);
    await step.click();
    release();
    const status = page.getByRole("status", { name: "Design generation" });
    await expect(status).toHaveText("Your preview did not finish. Your recommendations are still available.");
    await expect(step).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("region", { name: "Submitted answers" })).toContainText("Keep the oak floor.");
    await page.getByRole("button", { name: "View design", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message the design assistant" })).toBeEnabled();
    await page.getByRole("button", { name: "Try one more render", exact: true }).click();
    await expect.poll(() => attempts).toEqual([1, 2]);
    await expect(status).toHaveText("Your preview did not finish. Your recommendations are still available.");
    await expect(page.getByRole("button", { name: /render|try one more/i })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Message the design assistant" })).toBeEnabled();
    // Terminal revision also clears the local review and status; no reset duplication here.
    await step.click();
    await page.getByRole("region", { name: "Submitted answers" })
      .getByRole("button", { name: "Revise brief", exact: true }).click();
    await expect(page.getByLabel("Anything to keep, avoid, or plan around?")).toHaveValue("Keep the oak floor.");
    await expect(page.getByRole("region", { name: "Submitted answers" })).toHaveCount(0);
    await expect(status).toHaveCount(0);
    expect(attempts).toEqual([1, 2]);
  } finally { release(); }
});

test("preview unavailable during review never announces a ready design or offers a render retry", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let previews = 0;
  await page.route("**/api/ai/consultation/preview", async (route) => {
    previews += 1;
    await gate;
    await route.fulfill({ status: 503, json: { error: unavailable } });
  });
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect.poll(() => previews).toBe(1);
    await reviewInvestment(page).click();
    // Observe each status mutation, not only the final text.
    await page.evaluate(() => {
      const status = document.querySelector('[role="status"][aria-label="Design generation"]')!;
      const scope = window as typeof window & { generationMessages?: string[] };
      scope.generationMessages = [status.textContent ?? ""];
      new MutationObserver((changes) => {
        for (const change of changes) {
          scope.generationMessages!.push(change.oldValue ?? "", status.textContent ?? "");
        }
      }).observe(status, { subtree: true, childList: true, characterData: true, characterDataOldValue: true });
    });
    release();
    await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Preview unavailable. Your recommendations are still available.");
    await expect(reviewInvestment(page)).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("region", { name: "Submitted answers" })).toBeVisible();
    await page.getByRole("button", { name: "View design", exact: true }).click();
    await expect(page.getByRole("region", { name: "Design workspace" }).getByRole("alert")).toContainText(unavailable);
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await expect(page.getByRole("button", { name: /render|try one more/i })).toHaveCount(0);
    expect(await page.evaluate(() => (window as typeof window & { generationMessages?: string[] }).generationMessages))
      .not.toContain("Your design is ready");
    expect(previews).toBe(1);
  } finally { release(); }
});

test("leaving held analysis ignores its late result and restores only the durable intake", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let buffered = false;
  let delivered = false;
  let analyses = 0;
  let previews = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    analyses += 1;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    buffered = true;
    await gate;
    await route.fulfill({ response });
    delivered = true;
  });
  await page.route("**/api/ai/consultation/preview", (route) => {
    previews += 1;
    return route.fulfill({ status: 503, json: { error: unavailable } });
  });
  try {
    await prepareConsultation(page, image);
    await page.getByLabel("Anything to keep, avoid, or plan around?").fill("Keep these saved answers.");
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect.poll(() => buffered).toBe(true);
    await reviewInvestment(page).click();
    await expect.poll(() => savedDesign(page)).toMatchObject({
      step: 4, notes: "Keep these saved answers.", fileName: "living-room.png", hasResult: false, previewStatus: "idle",
    });
    await page.getByRole("contentinfo").getByRole("link", { name: "All pieces", exact: true }).click();
    await expect(page).toHaveURL(/\/shop$/);
    release();
    await expect.poll(() => delivered).toBe(true);
    await page.goto("/ai-consultation");
    await expect(page.getByLabel("Anything to keep, avoid, or plan around?")).toHaveValue("Keep these saved answers.");
    await expect(page.getByLabel("Guided room intake")).toBeVisible();
    await expect(page.getByRole("region", { name: "Design workspace" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Submitted answers" })).toHaveCount(0);
    await expect(page.getByRole("status", { name: "Design generation" })).toHaveCount(0);
    expect(await savedDesign(page)).toMatchObject({ hasResult: false, previewStatus: "idle", fileName: "living-room.png" });
    expect(analyses).toBe(1);
    expect(previews).toBe(0);
    // Client abandonment only: this does not prove provider-side cancellation.
  } finally { release(); }
});

for (const recovery of ["invalid CSRF", "expired signed cookie"] as const) {
  test(`real-server 401 from ${recovery} renews credentials once within one generation`, async ({ page, context }) => {
    const image = await createTestJpeg(page);
    let releaseRenewal!: () => void;
    let releaseAnalysis!: () => void;
    const renewalGate = new Promise<void>((resolve) => { releaseRenewal = resolve; });
    const analysisGate = new Promise<void>((resolve) => { releaseAnalysis = resolve; });
    let handshakes = 0;
    let renewed = false;
    let analysisReady = false;
    const statuses: number[] = [];
    const tokens: string[] = [];
    const attempts: number[] = [];
    await page.route("**/api/ai/session", async (route) => {
      handshakes += 1;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      if (handshakes === 2) {
        renewed = true;
        await renewalGate;
      }
      await route.fulfill({ response });
    });
    await page.route("**/api/ai/consultation", async (route) => {
      const headers = route.request().headers();
      tokens.push(headers["x-ai-csrf"]);
      // Both 401 responses come from real production security, not a synthetic response.
      const response = await route.fetch(recovery === "invalid CSRF" && tokens.length === 1
        ? { headers: { ...headers, "x-ai-csrf": "incorrect" } } : undefined);
      statuses.push(response.status());
      if (statuses.length === 2) {
        analysisReady = true;
        await analysisGate;
      }
      await route.fulfill({ response });
    });
    await page.route("**/api/ai/consultation/preview", (route) => {
      attempts.push(route.request().postDataJSON().attempt);
      return route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
    });
    try {
      await prepareConsultation(page, image);
      await expect.poll(() => handshakes).toBe(1);
      const cookie = (await context.cookies()).find(({ name }) => name === "vestrel-ai-session")!;
      expect(cookie).toBeDefined();
      const originalSessionId = cookie.value.split(".")[0];
      if (recovery === "expired signed cookie") {
        // Use the configured test secret. Keep the real session ID and CSRF binding.
        const config = readFileSync("playwright.config.ts", "utf8");
        const secret = config.match(/AI_SESSION_SECRET=([^\s]+)/)?.[1];
        expect(secret).toBeTruthy();
        const unsigned = `${originalSessionId}.${Date.now() - 3 * 60 * 60 * 1000}`;
        const signature = createHmac("sha256", secret!).update(unsigned).digest("base64url");
        await context.addCookies([{ ...cookie, value: `${unsigned}.${signature}` }]);
      }
      await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
      const design = page.getByRole("region", { name: "Design workspace" });
      await expect(design).toBeVisible();
      const originalPanel = await design.elementHandle();
      await expect.poll(() => renewed).toBe(true);
      expect(statuses).toEqual([401]);
      await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Generating your design…");
      await expect(page.getByRole("heading", { name: "Creating your room design" })).toBeVisible();
      releaseRenewal();
      await expect.poll(() => analysisReady).toBe(true);
      expect(statuses).toEqual([401, 200]);
      await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Generating your design…");
      expect(await design.evaluate((node, original) => node === original, originalPanel)).toBe(true);
      expect(attempts).toEqual([]);
      releaseAnalysis();
      await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Your design is ready");
      await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
      expect(statuses).toEqual([401, 200]);
      expect(handshakes).toBe(2);
      expect(attempts).toEqual([1]);
      const currentCookie = (await context.cookies()).find(({ name }) => name === "vestrel-ai-session")!;
      if (recovery === "expired signed cookie") {
        expect(currentCookie.value.split(".")[0]).not.toBe(originalSessionId);
        expect(tokens[1]).not.toBe(tokens[0]);
      } else {
        expect(currentCookie.value).toBe(cookie.value);
        expect(tokens[1]).toBe(tokens[0]);
      }
    } finally {
      releaseRenewal();
      releaseAnalysis();
    }
  });
}

for (const first of ["preview", "chat"] as const) {
  for (const stopChat of [false, true]) {
    test(`expired credentials recover concurrent preview and chat: ${first} first, ${stopChat ? "stop chat during renewal" : "complete both actions"}`, async ({ page, context }) => {
      const image = await createTestJpeg(page);
      let releaseRenewal!: () => void;
      let releasePreview!: () => void;
      const renewalGate = new Promise<void>((resolve) => { releaseRenewal = resolve; });
      const previewGate = new Promise<void>((resolve) => { releasePreview = resolve; });
      let handshakes = 0;
      const attempts: number[] = [];
      const previewStatuses: number[] = [];
      const chatStatuses: number[] = [];
      const previewTokens: string[] = [];
      const chatTokens: string[] = [];
      await page.route("**/api/ai/session", async (route) => {
        handshakes += 1;
        // route.fetch can rotate the browser cookie before route.fulfill.
        // Hold it until both requests receive a real security 401.
        if (handshakes > 1) await renewalGate;
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        await route.fulfill({ response });
      });
      await page.route("**/api/ai/consultation", async (route) => {
        const chat = route.request().postDataJSON().action === "chat";
        if (chat) chatTokens.push(route.request().headers()["x-ai-csrf"]);
        const response = await route.fetch();
        if (chat) chatStatuses.push(response.status());
        await route.fulfill({ response });
      });
      await page.route("**/api/ai/consultation/preview", async (route) => {
        const attempt = route.request().postDataJSON().attempt;
        attempts.push(attempt);
        if (attempt === 1) {
          await route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
          return;
        }
        previewTokens.push(route.request().headers()["x-ai-csrf"]);
        // Invalid input stops after real auth; no provider call is possible.
        const response = await route.fetch({ postData: JSON.stringify({}) });
        previewStatuses.push(response.status());
        if (response.status() === 422) {
          await previewGate;
          await route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
        } else {
          await route.fulfill({ response });
        }
      });
      try {
        await prepareConsultation(page, image);
        await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
        const status = page.getByRole("status", { name: "Design generation" });
        await expect(status).toHaveText("Your design is ready");
        const cookie = (await context.cookies()).find(({ name }) => name === "vestrel-ai-session")!;
        const config = readFileSync("playwright.config.ts", "utf8");
        const secret = config.match(/AI_SESSION_SECRET=([^\s]+)/)?.[1];
        expect(secret).toBeTruthy();
        const unsigned = `${cookie.value.split(".")[0]}.${Date.now() - 3 * 60 * 60 * 1000}`;
        const signature = createHmac("sha256", secret!).update(unsigned).digest("base64url");
        await context.addCookies([{ ...cookie, value: `${unsigned}.${signature}` }]);
        const input = page.getByRole("textbox", { name: "Message the design assistant" });
        const send = page.getByRole("button", { name: "Send", exact: true });
        const stop = page.getByRole("button", { name: "Stop", exact: true });
        for (const action of first === "preview" ? ["preview", "chat"] : ["chat", "preview"]) {
          if (action === "preview") {
            await page.getByRole("button", { name: "Try one more render", exact: true }).click();
            await expect.poll(() => previewStatuses).toEqual([401]);
          } else {
            await input.fill("Will this size fit my room?");
            await send.click();
            await expect.poll(() => chatStatuses).toEqual([401]);
          }
          await expect.poll(() => handshakes).toBe(2);
        }
        await expect(stop).toBeVisible();
        if (stopChat) {
          await stop.click();
          await expect(stop).toHaveCount(0);
          await expect(send).toBeVisible();
        }
        await expect(status).toHaveText("Your recommendations are ready. Your room preview is still generating.");
        releaseRenewal();
        await expect.poll(() => previewStatuses).toEqual([401, 422]);
        if (stopChat) {
          // The abandoned chat must not retry. A new message can use the renewed session.
          expect(chatStatuses).toEqual([401]);
          expect(chatTokens).toHaveLength(1);
          await input.fill("Can you check the room size again?");
          await send.click();
        }
        await expect(page.getByText("The current size check uses your chosen room measurements or planning assumption. Confirm wall lengths, doorways, and circulation with a consultant before final approval.", { exact: true })).toBeVisible();
        await expect(stop).toHaveCount(0);
        expect(chatStatuses).toEqual([401, 200]);
        expect(previewTokens[0]).toBe(chatTokens[0]);
        expect(previewTokens[1]).not.toBe(previewTokens[0]);
        expect(chatTokens[1]).toBe(previewTokens[1]);
        const renewedCookie = (await context.cookies()).find(({ name }) => name === "vestrel-ai-session")!;
        expect(renewedCookie.value.split(".")[0]).not.toBe(cookie.value.split(".")[0]);
        await expect(status).toHaveText("Your recommendations are ready. Your room preview is still generating.");
        await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();
        releasePreview();
        await expect(status).toHaveText("Your design is ready");
        await expect(page.getByRole("img", { name: "AI-generated room concept with the recommended furniture" })).toBeVisible();
        expect(previewStatuses).toEqual([401, 422]);
        expect(chatStatuses).toEqual([401, 200]);
        expect(attempts).toEqual([1, 2, 2]);
        expect(handshakes).toBe(2); // Initial credentials, then one shared renewal.
        await expect(page.getByRole("button", { name: /render|try one more/i })).toHaveCount(0);
        await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
      } finally {
        releaseRenewal();
        releasePreview();
      }
    });
  }
}

test("reloading a completed design during review restores results, not temporary review", async ({ page }) => {
  const image = await createTestJpeg(page);
  let analyses = 0;
  let previews = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    analyses += 1;
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", (route) => {
    previews += 1;
    return route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
  });
  await prepareConsultation(page, image);
  await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
  await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Your design is ready");
  await page.getByRole("checkbox", { name: "Include in Project Edit" }).first().uncheck();
  await reviewInvestment(page).click();
  await expect(page.getByRole("region", { name: "Submitted answers" })).toBeVisible();
  await expect.poll(() => savedDesign(page)).toMatchObject({ step: 5, hasResult: true, previewStatus: "ready", attempt: 1 });
  await expect.poll(async () => (await savedDesign(page))?.selectedProductIds.length).toBe(2);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
  await expect(page.getByRole("img", { name: "AI-generated room concept with the recommended furniture" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Your design is ready");
  await expect(page.getByRole("region", { name: "Submitted answers" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Review completed answers" }).locator('[aria-current="step"]')).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Include in Project Edit" }).first()).not.toBeChecked();
  expect(analyses).toBe(1);
  expect(previews).toBe(1);
});

test("accepting selected products leaves for Project Edit during preview rendering", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let previews = 0;
  let delivered = false;
  await page.route("**/api/ai/consultation/preview", async (route) => {
    previews += 1;
    await gate;
    await route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
    delivered = true;
  });
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect.poll(() => previews).toBe(1);
    const recommendations = page.getByRole("region", { name: "Catalog recommendations" });
    const names = await recommendations.getByRole("heading", { level: 3 }).allTextContents();
    expect(names).toHaveLength(3);
    await page.getByRole("checkbox", { name: "Include in Project Edit" }).first().uncheck();
    await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();
    await expect.poll(() => savedDesign(page)).toMatchObject({ step: 5, hasResult: true, previewStatus: "rendering", attempt: 1 });
    await expect.poll(async () => (await savedDesign(page))?.selectedProductIds.length).toBe(2);
    const accept = page.getByRole("button", { name: "Accept configuration", exact: true });
    await expect(accept).toBeEnabled();
    await accept.click();
    await expect(page).toHaveURL(/\/project-edit\?source=ai$/);
    await expect(page.getByRole("heading", { level: 1, name: "Your Project Edit" })).toBeVisible();
    const products = page.getByRole("region", { name: "Products", exact: true });
    await expect(products.getByRole("heading", { level: 3 })).toHaveText(names.slice(1));
    await expect(products.getByRole("heading", { name: names[0], exact: true })).toHaveCount(0);
    release();
    await expect.poll(() => delivered).toBe(true);
    await expect(page).toHaveURL(/\/project-edit\?source=ai$/);
    expect(previews).toBe(1);
    // Only selection saving and navigation are guaranteed, not background preview continuation.
  } finally { release(); }
});

// Existing generation spec covers synchronous double submit and normal retry/revision.
// Existing reset spec covers deadlines, stale callbacks/errors/renewal, durable reset,
// persistence failure, and interrupted preview restoration at attempts 1 and 2.
// Existing continuity spec covers completion/focus, draft/selection and real partial streams.
test.skip("pending image replacement can finish after generation starts", async () => {
  // Accepted deferral: upload A, hold replacement B, submit A, then finish B.
  // Required future fix: review/session/request must use the same submitted image.
  // Do not claim same-draft snapshot consistency until that upload race is fixed.
});
