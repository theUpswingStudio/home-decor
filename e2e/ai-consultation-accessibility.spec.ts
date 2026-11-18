import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { test, createTestJpeg, prepareConsultation } from "./helpers/ai-consultation";

const notes = "Keep the balcony path clear. Leave space to read by the window.\n".repeat(10).slice(0, 600);
const longFilename = `${"living-room-reference-".repeat(9)}.jpg`;
const steps = ["Room and reference", "Set room size", "Style and priorities", "Set investment"];

async function holdGeneration(page: Page) {
  const image = await createTestJpeg(page);
  let releaseAnalysis!: () => void;
  let releasePreview!: () => void;
  const analysisGate = new Promise<void>((resolve) => { releaseAnalysis = resolve; });
  const previewGate = new Promise<void>((resolve) => { releasePreview = resolve; });
  await page.route("**/api/ai/consultation", async (route) => {
    if (route.request().postDataJSON().action !== "analyze") return route.continue();
    const response = await route.fetch();
    await analysisGate;
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", async (route) => {
    await previewGate;
    await route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
  });
  return { image, releaseAnalysis, releasePreview };
}

async function prepareLongAnswers(page: Page, image: Buffer) {
  await page.goto("/ai-consultation");
  await page.locator('input[type="file"]').setInputFiles({ name: longFilename, mimeType: "image/jpeg", buffer: image });
  await expect(page.getByLabel("Guided room intake").getByText(longFilename)).toBeVisible();
  for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Anything to keep, avoid, or plan around?").fill(notes);
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  if (process.env.TASK5_VISUAL_DIR) {
    await page.screenshot({ path: `${process.env.TASK5_VISUAL_DIR}/${info.project.name}-${name}.png` });
  }
}

async function expectMainFits(page: Page) {
  const overflow = await page.locator("main").evaluate((main) => {
    const width = document.documentElement.clientWidth;
    return [main, ...main.querySelectorAll<HTMLElement>("*")].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && (rect.left < -1 || rect.right > width + 1);
    }).map((node) => ({ tag: node.tagName, class: node.className, text: node.textContent?.slice(0, 60) }));
  });
  expect(overflow).toEqual([]);
}

async function position(anchor: Locator) {
  return anchor.evaluate((node) => ({ top: node.getBoundingClientRect().top, scrollY }));
}

// The continuity spec already checks Enter, return-action tab order, and hidden result controls.
test("held generation, answer review, and results ready during review have no serious Axe issues", async ({ page }, info) => {
  const held = await holdGeneration(page);
  try {
    await prepareConsultation(page, held.image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    const status = page.getByRole("status", { name: "Design generation" });
    await expect(status).toHaveText("Generating your design…");
    for (const phase of ["generation", "review", "recommendations", "ready"]) {
      if (phase === "review") {
        const button = page.getByRole("navigation", { name: "Review completed answers" }).getByRole("button", { name: "Set investment", exact: true });
        await button.focus();
        await page.keyboard.press("Enter");
      } else if (phase === "recommendations") {
        held.releaseAnalysis();
        await expect(status).toHaveText("Your recommendations are ready. Your room preview is still generating.");
      } else if (phase === "ready") {
        held.releasePreview();
        await expect(status).toHaveText("Your design is ready");
      }
      if (phase !== "generation") {
        await expect(page.getByRole("region", { name: "Submitted answers" }).getByRole("heading")).toBeFocused();
        await expect(page.locator('section[aria-label="Design workspace"]')).toBeHidden();
      }
      const report = await new AxeBuilder({ page }).analyze();
      expect(report.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
      await screenshot(page, info, `axe-${phase}`);
    }
  } finally {
    held.releaseAnalysis();
    held.releasePreview();
  }
});

test("320px whole page has no horizontal overflow before generation", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/ai-consultation");
  await expect(page.getByRole("heading", { name: "Design with AI" })).toBeVisible();
  const geometry = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    header: document.querySelector(".site-header__utility")?.getBoundingClientRect().toJSON(),
    main: document.querySelector("main")?.getBoundingClientRect().toJSON(),
  }));
  await info.attach("pre-generation-overflow", { body: JSON.stringify(geometry, null, 2), contentType: "application/json" });
  console.log("Pre-generation page geometry:", geometry);
  // Confirmed before submission: the global header utility reaches 327.5px at 320px.
  // Keep this executed expected failure separate from strict workspace overflow checks.
  test.fail(true, "Pre-existing global header overflow at 320px; header changes are outside Task 5.");
  expect(geometry.scrollWidth).toBeLessThanOrEqual(320);
});

for (const width of [320, 640]) {
  test(`${width}px review preserves scroll and visible answers after analysis and preview`, async ({ page }, info) => {
    // 640px also checks reflow at half a 1280px desktop viewport. It is not browser zoom.
    await page.setViewportSize({ width, height: 740 });
    const held = await holdGeneration(page);
    try {
      await prepareLongAnswers(page, held.image);
      await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
      const navigation = page.getByRole("navigation", { name: "Review completed answers" });
      const review = page.getByRole("region", { name: "Submitted answers" });
      const status = page.getByRole("status", { name: "Design generation" });
      await expectMainFits(page);
      for (const name of steps) {
        const button = navigation.getByRole("button", { name, exact: true });
        await button.focus();
        await expect(button).toBeInViewport();
        await page.keyboard.press("Enter");
        const heading = review.getByRole("heading", { name, exact: true });
        await expect(heading).toBeFocused();
        const headingBounds = await heading.boundingBox();
        const statusBounds = await status.locator("..").boundingBox();
        expect(headingBounds!.y).toBeGreaterThanOrEqual(statusBounds!.y + statusBounds!.height);
        await expectMainFits(page);
        if (name === steps[0]) await expect(review).toContainText(longFilename);
        await screenshot(page, info, `${width}-${name.replaceAll(" ", "-")}`);
      }
      const anchor = review.locator("dd").last();
      await expect(anchor).toHaveText(notes);
      // Keep the first sentence below the sticky status, with no focus or scroll after release.
      await anchor.evaluate((node) => window.scrollBy(0, node.getBoundingClientRect().top - 340));
      const before = await position(anchor);
      expect(before.scrollY).toBeGreaterThan(0);
      expect(before.top).toBeGreaterThan(250);
      expect(before.top).toBeLessThan(400);
      await expect(review.getByRole("heading")).toBeFocused();
      held.releaseAnalysis();
      await expect(status).toHaveText("Your recommendations are ready. Your room preview is still generating.");
      const afterAnalysis = await position(anchor);
      expect.soft(Math.abs(afterAnalysis.top - before.top), "analysis: visible answer position").toBeLessThanOrEqual(2);
      expect.soft(Math.abs(afterAnalysis.scrollY - before.scrollY), "analysis: document scroll").toBeLessThanOrEqual(2);
      await expect(review.getByRole("heading")).toBeFocused();
      await screenshot(page, info, `${width}-analysis-scrolled`);
      held.releasePreview();
      await expect(status).toHaveText("Your design is ready");
      const afterPreview = await position(anchor);
      expect.soft(Math.abs(afterPreview.top - before.top), "preview: visible answer position").toBeLessThanOrEqual(2);
      expect.soft(Math.abs(afterPreview.scrollY - before.scrollY), "preview: document scroll").toBeLessThanOrEqual(2);
      await expect(review.getByRole("heading")).toBeFocused();
      await expectMainFits(page);
      await screenshot(page, info, `${width}-preview-scrolled`);
      await info.attach("completion-positions", { body: JSON.stringify({ before, afterAnalysis, afterPreview }), contentType: "application/json" });
    } finally {
      held.releaseAnalysis();
      held.releasePreview();
    }
  });
}

test("reduced motion keeps status visible and the result accept panel below it", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const held = await holdGeneration(page);
  try {
    await prepareConsultation(page, held.image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    const status = page.getByRole("status", { name: "Design generation" });
    await expect(status).toHaveText("Generating your design…");
    expect(await page.locator("main").evaluate((main) => main.getAnimations({ subtree: true }).length)).toBe(0);
    held.releaseAnalysis();
    await expect(status).toHaveText("Your recommendations are ready. Your room preview is still generating.");
    expect(await page.locator("main").evaluate((main) => main.getAnimations({ subtree: true }).length)).toBe(0);
    held.releasePreview();
    await expect(status).toHaveText("Your design is ready");
    const panel = page.locator('aside[aria-labelledby="accept-title"]');
    await panel.scrollIntoViewIfNeeded();
    const sticky = await panel.evaluate((node) => getComputedStyle(node).position === "sticky");
    if (sticky) await page.evaluate(() => window.scrollBy(0, 300));
    const statusBounds = await status.locator("..").boundingBox();
    const panelBounds = await panel.boundingBox();
    expect(statusBounds).not.toBeNull();
    expect(panelBounds).not.toBeNull();
    // Mobile uses normal document flow, not a second sticky surface.
    if (sticky) expect(panelBounds!.y).toBeGreaterThanOrEqual(statusBounds!.y + statusBounds!.height);
    await screenshot(page, info, "sticky-results");
  } finally {
    held.releaseAnalysis();
    held.releasePreview();
  }
});

test("credential renewal timeout keeps scrolled answers and focus, with recovery on return", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.clock.install();
  const image = await createTestJpeg(page);
  let releaseRenewal!: () => void;
  const gate = new Promise<void>((resolve) => { releaseRenewal = resolve; });
  let handshakes = 0;
  await page.route("**/api/ai/session", async (route) => {
    handshakes += 1;
    if (handshakes === 1) return route.continue();
    await gate;
    await route.fulfill({ status: 503, json: { error: "Protected session unavailable." } });
  });
  await page.route("**/api/ai/consultation", (route) => route.fulfill({ status: 401, json: { error: "Session expired." } }));
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({ status: 503, json: { error: "Preview unavailable." } }));
  try {
    await prepareLongAnswers(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect.poll(() => handshakes).toBe(2);
    await page.getByRole("navigation", { name: "Review completed answers" }).getByRole("button", { name: "Set investment", exact: true }).click();
    const review = page.getByRole("region", { name: "Submitted answers" });
    const anchor = review.locator("dd").last();
    await anchor.evaluate((node) => window.scrollBy(0, node.getBoundingClientRect().top - 340));
    const before = await position(anchor);
    await page.clock.fastForward(20_001);
    await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Generation did not finish. Your answers are unchanged.");
    const after = await position(anchor);
    expect.soft(Math.abs(after.top - before.top), "timeout: visible answer position").toBeLessThanOrEqual(2);
    expect.soft(Math.abs(after.scrollY - before.scrollY), "timeout: document scroll").toBeLessThanOrEqual(2);
    await expect(review.getByRole("heading")).toBeFocused();
    await page.getByRole("button", { name: "Back to generation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry protected session", exact: true })).toBeEnabled();
  } finally { releaseRenewal(); }
});
