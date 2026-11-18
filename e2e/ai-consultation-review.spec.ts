import { expect, type Page } from "@playwright/test";
import type { SavedConsultationRecord } from "../src/lib/ai/consultation-storage";
import { test, createTestJpeg, prepareConsultation } from "./helpers/ai-consultation";

const steps = ["Room and reference", "Set room size", "Style and priorities", "Set investment"];

async function savedAnswers(page: Page) {
  return page.evaluate(async () => {
    const record = await new Promise<SavedConsultationRecord>((resolve, reject) => {
      const open = indexedDB.open("vestrel-house-ai-consultation", 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const database = open.result;
        const transaction = database.transaction("consultations", "readonly");
        const request = transaction.objectStore("consultations").get(
          localStorage.getItem("vestrel-house:ai-consultation:latest:v3") || "",
        );
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
      };
    });
    return record ? { step: record.step, intake: record.intake, assetId: record.room.assetId } : null;
  });
}

test("reviews all submitted answers without editing or new generation requests", async ({ page, isMobile }) => {
  const image = await createTestJpeg(page);
  const notes = "Keep the oak floor.\nLeave the balcony path clear.\n".padEnd(600, "A");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let analysisRequests = 0;
  let previewRequests = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    analysisRequests += 1;
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", async (route) => {
    previewRequests += 1;
    await route.fulfill({ status: 503, json: { error: "Preview unavailable." } });
  });
  try {
    await prepareConsultation(page, image);
    const navigation = page.getByRole("navigation", { name: "Review completed answers" });
    await expect(navigation).toHaveCount(0);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("checkbox", { name: "Hosting", exact: true }).check();
    await page.getByRole("checkbox", { name: "Storage", exact: true }).check();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: /Measured/ }).click();
    await page.getByRole("spinbutton", { name: "Width" }).fill("15.5");
    await page.getByRole("spinbutton", { name: "Length" }).fill("21");
    await page.getByRole("spinbutton", { name: "Ceiling" }).fill("10.5");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "$20,000–$35,000 Choose", exact: true }).click();
    await page.getByLabel("Anything to keep, avoid, or plan around?").fill(notes);
    await expect.poll(async () => (await savedAnswers(page))?.intake.notes).toBe(notes);
    const submitted = await savedAnswers(page);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("button")).toHaveCount(4);
    await expect(page.getByLabel("Design consultation progress")).toHaveCount(0);
    if (isMobile) {
      const boxes = await navigation.getByRole("button").evaluateAll((buttons) => buttons.map((button) => {
        const { x, y, width } = button.getBoundingClientRect();
        return { x, y, width };
      }));
      expect(boxes[0].y).toBe(boxes[1].y);
      expect(boxes[2].y).toBe(boxes[3].y);
      expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
      expect(boxes[1].x).toBeGreaterThanOrEqual(boxes[0].x + boxes[0].width);
    }
    const source = await page.getByRole("img", { name: "Your submitted room" }).getAttribute("src");
    const review = page.getByRole("region", { name: "Submitted answers" });
    for (const [index, step] of steps.entries()) {
      const button = navigation.getByRole("button", { name: step, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-current", "step");
      await expect(navigation.locator('[aria-current="step"]')).toHaveCount(1);
      await expect(review.getByRole("heading", { name: step, exact: true })).toBeVisible();
      await expect(review.locator("input, textarea, select, [contenteditable=true]")).toHaveCount(0);
      await expect(review.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();
      await expect(review.getByRole("button", { name: "Revise brief", exact: true })).toHaveAccessibleDescription(/Editing is unavailable until generation finishes/);
      await expect(review.locator("dl")).toHaveCount(1);
      if (index === 0) {
        await expect(review).toContainText("Living room");
        await expect(review).toContainText("living-room.png");
        await expect(review.getByRole("img", { name: "Your submitted room" })).toHaveAttribute("src", source!);
        await expect.poll(() => review.getByRole("img").evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(640);
      } else if (index === 1) {
        await expect(review).toContainText("Measured");
        for (const [label, value] of [["Width", "15.5 ft"], ["Length", "21 ft"], ["Ceiling", "10.5 ft"]]) {
          await expect(review.locator("dl > div").filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${label}$`) }) }).getByRole("definition")).toHaveText(value);
        }
      } else if (index === 2) {
        for (const answer of ["Soft modern", "Conversation", "Reading", "Hosting", "Storage"]) await expect(review).toContainText(answer);
      } else {
        await expect(review).toContainText("$20,000–$35,000");
        const fullNotes = review.getByRole("definition").last();
        expect(await fullNotes.textContent()).toBe(notes);
        await expect(fullNotes).toHaveCSS("white-space", "pre-wrap");
        await expect(fullNotes).toHaveCSS("overflow-wrap", "anywhere");
      }
      await page.getByRole("button", { name: "Back to generation", exact: true }).click();
      await expect(page.getByRole("region", { name: "Design workspace" })).toBeVisible();
      await expect(review).toHaveCount(0);
      await expect(navigation.locator('[aria-current="step"]')).toHaveCount(0);
    }
    expect(await savedAnswers(page)).toEqual(submitted);
    expect(analysisRequests).toBe(1);
    expect(previewRequests).toBe(0);
    await navigation.getByRole("button", { name: "Set investment", exact: true }).click();
    release();
    await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Preview unavailable");
    await expect(review).toBeVisible();
    await expect(review.getByRole("button", { name: "Revise brief", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "View design", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
    await navigation.getByRole("button", { name: "Room and reference", exact: true }).click();
    await page.getByRole("button", { name: "View design", exact: true }).click();
    expect(analysisRequests).toBe(1);
    expect(previewRequests).toBe(1);
  } finally { release(); }
});

for (const [preset, dimensions] of [["Small", "10 × 12 ft"], ["Medium", "14 × 18 ft"], ["Large", "18 × 24 ft"]]) {
  test(`reviews assumed ${preset.toLowerCase()} dimensions and empty notes, then revises the brief`, async ({ page }) => {
    const image = await createTestJpeg(page);
    await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({ status: 503, json: { error: "Preview unavailable." } }));
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(`^${preset}`) }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(page.getByRole("status", { name: "Design generation" })).toContainText("Preview unavailable");
    const navigation = page.getByRole("navigation", { name: "Review completed answers" });
    const review = page.getByRole("region", { name: "Submitted answers" });
    await navigation.getByRole("button", { name: "Set room size", exact: true }).click();
    await expect(review).toContainText(`${preset} (assumed)`);
    await expect(review).toContainText(dimensions);
    await navigation.getByRole("button", { name: "Set investment", exact: true }).click();
    await expect(review).toContainText("No additional notes");
    await expect(review).toContainText("These are your submitted answers. Choose Revise brief to make changes.");
    await review.getByRole("button", { name: "Revise brief", exact: true }).click();
    await expect(page.getByLabel("Anything to keep, avoid, or plan around?")).toHaveValue("");
    await expect(navigation).toHaveCount(0);
    await expect(review).toHaveCount(0);
    await expect(page.getByRole("status", { name: "Design generation" })).toHaveCount(0);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(page.getByRole("region", { name: "Design workspace" })).toBeVisible();
    await expect(navigation.locator('[aria-current="step"]')).toHaveCount(0);
    await navigation.getByRole("button", { name: "Room and reference", exact: true }).click();
    await page.getByRole("button", { name: "Start over", exact: true }).click();
    await page.getByRole("button", { name: "Clear and start over", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Which room are we working on?" })).toBeVisible();
    await expect(navigation).toHaveCount(0);
    await expect(review).toHaveCount(0);
  });
}
