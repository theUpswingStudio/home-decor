import { expect, test, type Page } from "@playwright/test";

async function createTestJpeg(page: Page): Promise<Buffer> {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 400;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.fillStyle = "#d8d0c3";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#4f6047";
    context.fillRect(80, 80, 220, 180);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("JPEG creation failed.")),
      "image/jpeg",
      0.85,
    ));
    return [...new Uint8Array(await blob.arrayBuffer())];
  });
  return Buffer.from(bytes);
}

async function buildRecommendations(page: Page, roomImage: Buffer) {
  await page.goto("/ai-consultation");
  await expect(page.getByRole("heading", { name: "Design with AI" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "living-room.png",
    mimeType: "image/jpeg",
    buffer: roomImage,
  });
  await expect(page.getByLabel("Guided room intake").getByText("living-room.png")).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build recommendations" }).click();
}

test("renders once, retries the current selection, and restores without chat", async ({ page }) => {
  const roomImage = await createTestJpeg(page);
  let finishFirstPreview: (() => void) | undefined;
  const firstPreviewGate = new Promise<void>((resolve) => {
    finishFirstPreview = resolve;
  });
  const previewBodies: unknown[] = [];

  await page.route("**/api/ai/consultation/preview", async (route) => {
    previewBodies.push(route.request().postDataJSON());
    if (previewBodies.length === 1) await firstPreviewGate;
    await route.fulfill({
      status: 200,
      contentType: "image/jpeg",
      body: roomImage,
      headers: {
        "X-AI-Image-Model": "openai/gpt-image-2",
        "X-AI-Prompt-Version": "room-preview-v1",
        "X-AI-Preview-Signature": `preview-${previewBodies.length}`,
      },
    });
  });

  await buildRecommendations(page, roomImage);

  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
  await expect(page.getByText("Composing the room preview")).toBeVisible();
  expect(previewBodies).toHaveLength(1);

  finishFirstPreview?.();
  await expect(page.getByText("Original room", { exact: true })).toBeVisible();
  await expect(page.getByText("AI concept preview", { exact: true })).toBeVisible();
  await expect(page.getByText(
    "AI concept preview. Product details, color, scale, and placement can differ.",
  )).toBeVisible();

  await page.getByLabel("Include in Project Edit").first().uncheck();
  await expect(page.getByText("This image uses the earlier recommendation selection.")).toBeVisible();
  await page.getByRole("button", { name: "Render current selection" }).click();
  await expect.poll(() => previewBodies.length).toBe(2);

  const retry = previewBodies[1] as { attempt: number; products: readonly unknown[] };
  expect(retry.attempt).toBe(2);
  expect(retry.products).toHaveLength(2);
  await expect(page.getByRole("button", { name: /render|try one more/i })).toHaveCount(0);

  const chatMessage = "Would the darker finish work here?";
  await page.getByPlaceholder("Ask why a finish works or whether another piece would suit the room.")
    .fill(chatMessage);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(chatMessage, { exact: true })).toBeVisible();
  await page.waitForTimeout(200);

  await page.reload();
  await expect(page.getByText("AI concept preview", { exact: true })).toBeVisible();
  await expect(page.getByText(chatMessage, { exact: true })).toHaveCount(0);
  expect(previewBodies).toHaveLength(2);

  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
  await page.waitForTimeout(150);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your room, reimagined" })).toHaveCount(0);
});

test("keeps recommendations and chat usable when image rendering fails", async ({ page }) => {
  const roomImage = await createTestJpeg(page);
  await page.route("**/api/ai/consultation/preview", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: "Image rendering is busy. Use your retry in a moment." }),
    });
  });

  await buildRecommendations(page, roomImage);

  await expect(page.getByText("Preview not completed")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
  await expect(page.getByPlaceholder(
    "Ask why a finish works or whether another piece would suit the room.",
  )).toBeEnabled();
  await expect(page.getByRole("button", { name: "Try one more render" })).toBeVisible();
});
