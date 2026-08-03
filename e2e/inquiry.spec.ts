import { expect, test } from "@playwright/test";
import { catalog } from "../src/data/catalog";

async function completeProjectStep(page: import("@playwright/test").Page) {
  await page
    .getByRole("group", { name: "Which design service do you need? Required" })
    .getByRole("radio")
    .first()
    .check();
  await page
    .getByRole("group", { name: "What is the project scope? Required" })
    .getByRole("radio")
    .first()
    .check();
  await page.getByLabel("ZIP or postal code Required").fill("10001");
  await page
    .getByRole("group", { name: "What is your timeline? Required" })
    .getByRole("radio")
    .first()
    .check();
  await page
    .getByRole("group", { name: "What is the working investment? Required" })
    .getByRole("radio")
    .first()
    .check();
}

test("inquiry validates both steps, preserves Back state, and never submits", async ({
  page,
}) => {
  const mutatingRequests: string[] = [];
  const requests: { url: string; postData: string | null }[] = [];
  page.on("request", (request) => {
    requests.push({ url: request.url(), postData: request.postData() });
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      mutatingRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto("/design-services/inquire");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex.*follow/i,
  );
  await expect(page.locator("form [name]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue to details" }),
  ).toHaveAttribute("type", "button");
  await page.getByRole("button", { name: "Continue to details" }).click();
  let errorSummary = page.getByRole("alert", {
    name: "Check the following fields",
  });
  await expect(errorSummary).toBeFocused();
  await expect(errorSummary.getByRole("listitem")).toHaveCount(5);
  await errorSummary.getByRole("link", { name: /ZIP or postal code:/ }).click();
  await expect(page.getByLabel("ZIP or postal code Required")).toBeFocused();
  await errorSummary.getByRole("link", { name: /Design service:/ }).click();
  await expect(page.locator("#designService-field")).toBeFocused();

  await completeProjectStep(page);
  await page.getByLabel("ZIP or postal code Required").press("Enter");
  await expect(page.getByText("Step 2 of 2")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: catalog.inquiry.steps[1].title }),
  ).toBeFocused();
  await expect(page.locator("form [name]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Complete demonstration" }),
  ).toHaveAttribute("type", "button");

  await page.getByRole("button", { name: "Complete demonstration" }).click();
  errorSummary = page.getByRole("alert", {
    name: "Check the following fields",
  });
  await expect(errorSummary).toBeFocused();
  await expect(errorSummary.getByRole("listitem")).toHaveCount(2);
  await errorSummary.getByRole("link", { name: /Full name:/ }).click();
  await expect(page.getByLabel("Full name Required")).toBeFocused();
  await page.getByLabel("Full name Required").fill("Alex Morgan");
  await page.getByLabel("Email Required").fill("alex@example.test");

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("ZIP or postal code Required")).toHaveValue("10001");
  await expect(
    page
      .getByRole("group", { name: "Which design service do you need? Required" })
      .getByRole("radio")
      .first(),
  ).toBeChecked();

  await page.getByRole("button", { name: "Continue to details" }).click();
  await expect(page.getByLabel("Full name Required")).toHaveValue("Alex Morgan");
  await expect(page.getByLabel("Email Required")).toHaveValue("alex@example.test");
  await page.getByLabel("Email Required").press("Enter");

  const completionHeading = page.getByRole("heading", {
    name: "No inquiry was transmitted.",
  });
  await expect(completionHeading).toBeVisible();
  await expect(completionHeading).toBeFocused();
  await expect(page.getByText("This portfolio form is a demonstration only.", { exact: false })).toBeVisible();
  expect(mutatingRequests).toEqual([]);
  expect(
    requests.some(({ url, postData }) =>
      [url, postData ?? ""].some(
        (value) =>
          value.includes("Alex%20Morgan") ||
          value.includes("alex%40example.test") ||
          value.includes("alex@example.test"),
      ),
    ),
  ).toBe(false);
});

test("an inquiry started from Project Edit includes all saved entry types", async ({
  page,
}) => {
  const product = catalog.products[0];
  const variantId = product.variantIds[0];
  await page.addInitScript(
    ({ storageKey, savedVariantId, productId, roomId, collectionId }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          entries: [
            { type: "product", productId, variantId: savedVariantId, quantity: 2, addedAt: Date.now() },
            { type: "room", roomId, addedAt: Date.now() },
            { type: "material", collectionId, addedAt: Date.now() },
          ],
        }),
      );
    },
    {
      storageKey: "vestrel-house:project-edit:v1",
      savedVariantId: variantId,
      productId: product.id,
      roomId: catalog.rooms[0].id,
      collectionId: catalog.collections[0].id,
    },
  );

  await page.goto("/design-services/inquire?from=project-edit");
  const summary = page.getByRole("region", { name: "Selections from your Project Edit" });
  await expect(summary).toContainText(product.name);
  await expect(summary).toContainText("Qty. 2");
  await expect(summary).toContainText(catalog.rooms[0].name);
  await expect(summary).toContainText(catalog.collections[0].name);
});

test.describe("with JavaScript disabled", () => {
  test.use({ javaScriptEnabled: false });

  test("form controls cannot be serialized or submitted by its actions", async ({
    page,
  }) => {
    const navigationRequests: { url: string; postData: string | null }[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest()) {
        navigationRequests.push({
          url: request.url(),
          postData: request.postData(),
        });
      }
    });

    await page.goto("/design-services/inquire");
    navigationRequests.length = 0;

    const postalCode = page.getByLabel("ZIP or postal code Required");
    const continueButton = page.getByRole("button", {
      name: "Continue to details",
    });
    await expect(page.locator("form [name]")).toHaveCount(0);
    await expect(continueButton).toHaveAttribute("type", "button");

    await postalCode.fill("SW1A 1AA");
    await continueButton.click();
    await expect(page.getByText("Step 1 of 2")).toBeVisible();
    expect(navigationRequests).toEqual([]);

    await postalCode.press("Enter");
    await page.waitForTimeout(100);
    expect(
      navigationRequests.some(
        ({ url, postData }) =>
          decodeURIComponent(url).includes("SW1A 1AA") ||
          (postData?.includes("SW1A 1AA") ?? false),
      ),
    ).toBe(false);
  });
});
