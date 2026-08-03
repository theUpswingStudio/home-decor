import { expect, test } from "@playwright/test";
import { catalog } from "../src/data/catalog";

const product = catalog.products[0];
const variantId = product.variantIds[0];

test("a configured product moves from the PDP into Project Edit", async ({ page }) => {
  await page.goto(`/products/${product.slug}`);
  await page.getByRole("button", { name: "Save this configuration" }).click();

  await expect(page.getByText(`${product.name} configuration saved to Project Edit.`, { exact: false })).toBeVisible();
  const projectEditLink = page.getByRole("link", { name: /Project Edit, 1 entry/ });
  await expect(projectEditLink).toBeVisible();
  await projectEditLink.click();

  await expect(page).toHaveURL("/project-edit");
  await expect(page.getByRole("heading", { level: 1, name: "Your Project Edit" })).toBeVisible();
  await expect(page.getByRole("link", { name: product.name, exact: true })).toBeVisible();

  const quantity = page.getByLabel("Quantity");
  await quantity.fill("3");
  await expect(quantity).toHaveValue("3");
  await expect(page.getByRole("link", { name: /Project Edit, 1 entry/ })).toBeVisible();

  await page.getByRole("button", { name: "Clear Project Edit" }).click();
  await expect(page.getByRole("heading", { name: /direction starts/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Project Edit, 0 entries/ })).toBeVisible();
});

test("room and material context can be saved beside products", async ({ page }) => {
  await page.goto("/shop?entry=room-edit");
  await page.getByRole("button", { name: "Save room direction" }).first().click();

  await page.goto("/shop?entry=material-note");
  await page.getByRole("button", { name: "Save material note" }).first().click();

  await page.getByRole("link", { name: /Project Edit, 2 entries/ }).click();
  await expect(page.getByRole("heading", { name: "Room directions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Material notes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start consultation preview" })).toBeVisible();
});

test("the legacy cart migrates once and the old route redirects", async ({ page }) => {
  await page.addInitScript(
    ({ savedVariantId }) => {
      window.localStorage.setItem(
        "vestrel-house:cart",
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          items: [{ variantId: savedVariantId, quantity: 2 }],
        }),
      );
    },
    { savedVariantId: variantId },
  );

  await page.goto("/cart");
  await expect(page).toHaveURL("/project-edit");
  await expect(page.getByRole("link", { name: product.name, exact: true })).toBeVisible();
  await expect(page.getByLabel("Quantity")).toHaveValue("2");

  const storage = await page.evaluate(() => ({
    legacy: window.localStorage.getItem("vestrel-house:cart"),
    projectEdit: window.localStorage.getItem("vestrel-house:project-edit:v1"),
  }));
  expect(storage.legacy).toBeNull();
  expect(storage.projectEdit).not.toBeNull();
});
