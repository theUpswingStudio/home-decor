import { expect } from "@playwright/test";
import { test, createTestJpeg, prepareConsultation } from "./helpers/ai-consultation";

test("shows generation feedback before analysis returns", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let analysisRequests = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    if (route.request().postDataJSON().action !== "analyze") {
      await route.continue();
      return;
    }
    analysisRequests += 1;
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({
    status: 503,
    json: { error: "Image preview is unavailable because OpenRouter is not configured." },
  }));
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect(page.getByRole("heading", { name: "Creating your room design" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Generating your design");
    const design = page.getByRole("region", { name: "Design workspace" });
    await expect(design).toBeFocused();
    const statusTop = await page.getByRole("status", { name: "Design generation" }).evaluate((node) => node.getBoundingClientRect().top);
    const headerBottom = await page.locator(".site-header").evaluate((node) => node.getBoundingClientRect().bottom);
    expect(statusTop).toBeGreaterThanOrEqual(headerBottom);
    await expect(design.getByRole("img", { name: "Your submitted room" })).toBeVisible();
    await expect(design).toContainText("living-room.png");
    await expect(design).toContainText("Soft modern");
    await expect(page.getByLabel("Guided room intake")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start over", exact: true })).toBeEnabled();
    await expect.poll(() => analysisRequests).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Preview unavailable");
  expect(analysisRequests).toBe(1);
});

test("retains the brief after analysis failure and supports retry and revision", async ({ page }) => {
  const image = await createTestJpeg(page);
  let analysisRequests = 0;
  let previewRequests = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    analysisRequests += 1;
    if (analysisRequests === 1) {
      await route.fulfill({ status: 500, json: { error: "The room analysis could not finish." } });
      return;
    }
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", async (route) => {
    previewRequests += 1;
    await route.fulfill({
      status: 503,
      json: { error: "Image preview is unavailable because OpenRouter is not configured." },
    });
  });

  await prepareConsultation(page, image);
  await page.getByLabel("Anything to keep, avoid, or plan around?").fill("Keep the oak floor.");
  await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
  const design = page.getByRole("region", { name: "Design workspace" });
  await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Generation did not finish");
  await expect(design).toContainText("The room analysis could not finish.");
  await expect(design.getByRole("button", { name: "Revise brief", exact: true })).toBeEnabled();
  await design.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Preview unavailable");
  expect(analysisRequests).toBe(2);
  expect(previewRequests).toBe(1);

  await page.getByRole("button", { name: "Revise brief", exact: true }).click();
  await expect(page.getByLabel("Guided room intake")).toBeVisible();
  await expect(page.getByLabel("Anything to keep, avoid, or plan around?")).toHaveValue("Keep the oak floor.");
  await expect(page.getByRole("region", { name: "Design workspace" })).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Design generation" })).toHaveCount(0);
});

test("Start over abandons a held analysis without restoring its result", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let responseReady = false;
  let responseDelivered = false;
  let previewRequests = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    const response = await route.fetch();
    responseReady = true;
    await gate;
    await route.fulfill({ response });
    responseDelivered = true;
  });
  await page.route("**/api/ai/consultation/preview", async (route) => {
    previewRequests += 1;
    await route.fulfill({ status: 503, json: { error: "Preview unavailable." } });
  });
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect.poll(() => responseReady).toBe(true);
    await page.getByRole("button", { name: "Start over", exact: true }).click();
    await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
    release();
    await expect.poll(() => responseDelivered).toBe(true);
    await expect(page.getByLabel("Guided room intake")).toBeVisible();
    await expect(page.getByRole("region", { name: "Design workspace" })).toHaveCount(0);
    await expect(page.getByRole("status", { name: "Design generation" })).toHaveCount(0);
    expect(previewRequests).toBe(0);
  } finally {
    release();
  }
});
