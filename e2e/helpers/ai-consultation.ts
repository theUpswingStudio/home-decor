import { randomUUID } from "node:crypto";
import { expect, test as base, type Page } from "@playwright/test";

export const test = base.extend<{ aiNetworkIsolation: void }>({
  aiNetworkIsolation: [async ({ context, extraHTTPHeaders }, use) => {
    await context.setExtraHTTPHeaders({
      ...extraHTTPHeaders,
      "x-forwarded-for": `e2e-${randomUUID()}`,
    });
    await use();
  }, { auto: true }],
});

export async function createTestJpeg(page: Page): Promise<Buffer> {
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

export async function prepareConsultation(page: Page, roomImage: Buffer): Promise<void> {
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
}

export async function buildRecommendations(page: Page, roomImage: Buffer): Promise<void> {
  await prepareConsultation(page, roomImage);
  await page.getByRole("button", { name: "Build recommendations" }).click();
}
