import { expect, type Page } from "@playwright/test";
import { test, createTestJpeg, buildRecommendations, prepareConsultation } from "./helpers/ai-consultation";
import { startConsultationStream } from "./helpers/consultation-stream";

async function buildCompletedDesign(page: Page) {
  const image = await createTestJpeg(page);
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({
    status: 200,
    contentType: "image/jpeg",
    body: image,
  }));
  await buildRecommendations(page, image);
  await expect(page.getByRole("status", { name: "Design generation" })).toHaveText("Your design is ready");
  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
}

test("analysis and preview finish separately during review without changing view or focus", async ({ page }) => {
  const image = await createTestJpeg(page);
  let releaseAnalysis!: () => void;
  let releasePreview!: () => void;
  const analysisGate = new Promise<void>((resolve) => { releaseAnalysis = resolve; });
  const previewGate = new Promise<void>((resolve) => { releasePreview = resolve; });
  let analysisRequests = 0;
  let previewRequests = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    if (route.request().postDataJSON().action !== "analyze") {
      await route.continue();
      return;
    }
    analysisRequests += 1;
    const response = await route.fetch();
    await analysisGate;
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", async (route) => {
    previewRequests += 1;
    await previewGate;
    await route.fulfill({ status: 200, contentType: "image/jpeg", body: image });
  });
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    const design = page.locator('section[aria-label="Design workspace"]');
    await expect(design).toBeFocused();
    const designNode = await design.elementHandle();
    const step = page.getByRole("navigation", { name: "Review completed answers" })
      .getByRole("button", { name: "Style and priorities", exact: true });
    await step.click();
    const review = page.getByRole("region", { name: "Submitted answers" });
    const heading = review.getByRole("heading", { name: "Style and priorities", exact: true });
    const status = page.getByRole("status", { name: "Design generation" });
    await expect(heading).toBeFocused();
    await expect(status).toHaveText("Generating your design…");
    await expect(page.getByRole("button", { name: "Back to generation", exact: true })).toBeVisible();
    await expect.poll(() => analysisRequests).toBe(1);
    expect(previewRequests).toBe(0);

    releaseAnalysis();
    await expect(status).toHaveText("Your recommendations are ready. Your room preview is still generating.");
    await expect.poll(() => previewRequests).toBe(1);
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(step).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("button", { name: "View design", exact: true })).toBeVisible();
    await expect(design).toBeHidden();
    await expect(design.getByRole("heading", { name: "Catalog recommendations", includeHidden: true })).toBeAttached();
    await expect(review.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();

    releasePreview();
    await expect(status).toHaveText("Your design is ready");
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(step).toHaveAttribute("aria-current", "step");
    await expect(design).toBeHidden();
    await expect(review.getByRole("button", { name: "Revise brief", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "View design", exact: true }).click();
    await expect(design).toBeFocused();
    expect(await design.evaluate((node, original) => node === original, designNode)).toBe(true);
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await expect(page.getByRole("img", { name: "AI-generated room concept with the recommended furniture" })).toBeVisible();
    expect(analysisRequests).toBe(1);
    expect(previewRequests).toBe(1);
  } finally {
    releaseAnalysis();
    releasePreview();
  }
});

test("chat draft and changed product selection survive answer review", async ({ page }) => {
  await buildCompletedDesign(page);
  const products = page.getByRole("checkbox", { name: "Include in Project Edit" });
  await products.first().uncheck();
  const selection = await products.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked));
  expect(selection).toContain(true);
  expect(selection[0]).toBe(false);
  const draft = "Keep this draft while I review the room";
  const composer = page.getByRole("textbox", { name: "Message the design assistant" });
  await composer.fill(draft);
  await page.getByRole("navigation", { name: "Review completed answers" })
    .getByRole("button", { name: "Room and reference", exact: true }).click();
  await expect(page.getByRole("region", { name: "Submitted answers" })).toBeVisible();
  await expect(composer).toHaveCount(0);
  await page.getByRole("button", { name: "View design", exact: true }).click();
  await expect(page.getByRole("region", { name: "Design workspace" })).toBeFocused();
  await expect(composer).toHaveValue(draft);
  expect(await products.evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked))).toEqual(selection);
});

test("an outstanding buffered chat response completes while results are hidden", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let chatRequests = 0;
  let responseBuffered = false;
  await page.route("**/api/ai/consultation", async (route) => {
    if (route.request().postDataJSON().action !== "chat") {
      await route.continue();
      return;
    }
    chatRequests += 1;
    const response = await route.fetch();
    await response.body();
    responseBuffered = true;
    // This tests an outstanding request, not progressive stream delivery.
    await gate;
    await route.fulfill({ response });
  });
  try {
    await buildCompletedDesign(page);
    const question = "Will this size fit my room?";
    const answer = "The current size check uses your chosen room measurements or planning assumption. Confirm wall lengths, doorways, and circulation with a consultant before final approval.";
    await page.getByRole("textbox", { name: "Message the design assistant" }).fill(question);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => responseBuffered).toBe(true);
    const chat = page.locator('section[aria-labelledby="consultation-chat-title"]');
    await expect(chat.getByRole("article")).toHaveCount(2);
    await expect(chat.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Review completed answers" })
      .getByRole("button", { name: "Set room size", exact: true }).click();
    const heading = page.getByRole("region", { name: "Submitted answers" })
      .getByRole("heading", { name: "Set room size", exact: true });
    await expect(heading).toBeFocused();
    release();
    await expect(chat.getByRole("article", { includeHidden: true }).last()).toContainText(answer);
    await expect(chat.getByRole("button", { name: "Stop", exact: true, includeHidden: true })).toHaveCount(0);
    await expect(chat).toBeHidden();
    await expect(heading).toBeFocused();
    await page.getByRole("button", { name: "View design", exact: true }).click();
    await expect(chat.getByRole("article")).toHaveCount(3);
    await expect(chat.getByText(question, { exact: true })).toBeVisible();
    await expect(chat.getByText(answer, { exact: true })).toBeVisible();
    expect(chatRequests).toBe(1);
  } finally { release(); }
});

test("a genuine partial chat stream finishes hidden and returns as the same single assistant message", async ({ page }) => {
  const stream = await startConsultationStream(page);
  try {
    await buildCompletedDesign(page);
    const question = "Give me a room suggestion.";
    const partial = "A streamed room suggestion";
    const complete = `${partial} with space to move.`;
    const chat = page.locator('section[aria-labelledby="consultation-chat-title"]');
    await chat.getByRole("textbox", { name: "Message the design assistant" }).fill(question);
    await chat.getByRole("button", { name: "Send", exact: true }).click();
    await expect(chat.getByText(partial, { exact: true })).toBeVisible();
    await expect(chat.getByRole("button", { name: "Stop", exact: true })).toBeVisible();
    const assistant = chat.getByRole("article", { includeHidden: true }).filter({ hasText: partial });
    await expect(assistant).toHaveCount(1);
    const messageNode = await assistant.elementHandle();
    expect(stream.requests()).toBe(1);

    await page.getByRole("navigation", { name: "Review completed answers" })
      .getByRole("button", { name: "Set investment", exact: true }).click();
    const heading = page.getByRole("region", { name: "Submitted answers" })
      .getByRole("heading", { name: "Set investment", exact: true });
    await expect(heading).toBeFocused();
    await expect(chat).toBeHidden();
    stream.release();
    // Wait for React to consume the final chunks before leaving review.
    await expect(assistant).toContainText(complete);
    await expect(chat.getByRole("button", { name: "Stop", exact: true, includeHidden: true })).toHaveCount(0);
    await expect(chat).toBeHidden();
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();

    await page.getByRole("button", { name: "View design", exact: true }).click();
    await expect(page.getByRole("region", { name: "Design workspace" })).toBeFocused();
    await expect(assistant).toHaveCount(1);
    expect(await assistant.evaluate((node, original) => node === original, messageNode)).toBe(true);
    await expect(assistant.getByText(complete, { exact: true })).toBeVisible();
    await expect(chat.getByRole("article")).toHaveCount(3); // Initial answer, user, streamed answer.
    await expect(chat.getByText("Vestrel assistant", { exact: true })).toHaveCount(2);
    await expect(chat.getByText("You", { exact: true })).toHaveCount(1);
    await expect(chat.getByText(question, { exact: true })).toBeVisible();
    await expect(chat.getByRole("textbox", { name: "Message the design assistant" })).toHaveValue("");
    expect(stream.requests()).toBe(1);
  } finally { await stream.close(); }
});

test("reselecting a review step focuses its heading and hidden result controls leave the tab order", async ({ page }) => {
  await buildCompletedDesign(page);
  const step = page.getByRole("navigation", { name: "Review completed answers" })
    .getByRole("button", { name: "Set investment", exact: true });
  const heading = page.getByRole("region", { name: "Submitted answers" })
    .getByRole("heading", { name: "Set investment", exact: true });
  for (let selection = 0; selection < 2; selection += 1) {
    await step.focus();
    await page.keyboard.press("Enter");
    await expect(heading).toBeFocused();
    await expect(step).toHaveAttribute("aria-current", "step");
  }
  const design = page.locator('section[aria-label="Design workspace"]');
  await expect(design).toBeAttached();
  await expect(design).toBeHidden();
  await expect(page.getByRole("region", { name: "Design workspace" })).toHaveCount(0);
  await expect(design.getByRole("textbox", { includeHidden: true })).toHaveCount(1);
  for (const role of ["button", "checkbox", "textbox", "link", "heading"] as const) {
    await expect(design.getByRole(role)).toHaveCount(0);
  }
  // Results sit between the return action and review in DOM order.
  await step.focus();
  await page.keyboard.press("Tab");
  const viewDesign = page.getByRole("button", { name: "View design", exact: true });
  await expect(viewDesign).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("region", { name: "Submitted answers" })
    .getByRole("button", { name: "Revise brief", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(viewDesign).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(design).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Message the design assistant" })).toBeVisible();
});
