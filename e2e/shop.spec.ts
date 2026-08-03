import { expect, test } from "@playwright/test";
import { catalog } from "../src/data/catalog";
import {
  expectViewTransitionActivation,
  getViewTransitionBaseline,
  instrumentViewTransitions,
} from "./view-transition";

const category = catalog.categories[0];
const categoryProducts = catalog.products.filter(
  (candidate) => candidate.categoryId === category.id,
);
const searchQuery = "walnut, desk";
const searchProduct = catalog.products.find(
  (candidate) => candidate.slug === "axis-writing-desk",
)!;

test("the default shop is an editorial index with three entry types", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { level: 1, name: "The House Edit" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Entry type" })).toContainText("Products");
  await expect(page.getByText("Room edit", { exact: true })).toHaveCount(catalog.rooms.length);
  await expect(page.getByText("Material note", { exact: true })).toHaveCount(catalog.rooms.length);
  await expect(page.getByRole("heading", { name: "About the catalog images" })).toBeVisible();
  await expect(page.getByText("Reference image", { exact: true })).toHaveCount(0);
});

test("shop search and category filters select known products", async ({ page, isMobile }) => {
  await page.goto("/shop?entry=product");

  if (isMobile) {
    await page.getByRole("button", { name: "Filters" }).click();
    const dialog = page.getByRole("dialog", { name: "Filter entries" });
    await dialog.getByRole("searchbox", { name: "Search the edit" }).fill(searchQuery);
    await expect(page).toHaveURL(/entry=product/);
    await dialog.getByRole("button", { name: /Show 1 entry/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Filters (1)" })).toBeFocused();
  } else {
    await page.getByRole("searchbox", { name: "Search the edit" }).fill(searchQuery);
  }

  await expect(page).toHaveURL(/query=walnut(?:%2C|,)\+desk/);
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.getByRole("link", { name: searchProduct.name, exact: true })).toBeVisible();

  await page.goto("/shop?entry=product");
  if (isMobile) {
    await page.getByRole("button", { name: "Filters" }).click();
    const dialog = page.getByRole("dialog", { name: "Filter entries" });
    await dialog.locator(`#mobile-category-${category.slug}`).check();
    await dialog.getByRole("button", { name: new RegExp(`Show ${categoryProducts.length} entries`) }).click();
  } else {
    await page.getByText("More filters", { exact: true }).click();
    await page.locator(`#desktop-more-category-${category.slug}`).check();
  }
  await expect(page).toHaveURL(new RegExp(`category=${category.slug}`));
  await expect(page.locator("main article")).toHaveCount(categoryProducts.length);
});

test("mobile filters stage changes and restore state when canceled", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The filter dialog is only used at the mobile breakpoint.");
  await page.goto("/shop?entry=product");
  const trigger = page.getByRole("button", { name: "Filters", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Filter entries" });
  await dialog.locator(`#mobile-category-${category.slug}`).check();
  await expect(page).toHaveURL(/entry=product$/);
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog.locator(`#mobile-category-${category.slug}`)).not.toBeChecked();
});

test("removing filters restores focus to a surviving control", async ({ page }) => {
  const room = catalog.rooms[0];
  await page.goto(`/shop?entry=product&category=${category.slug}&room=${room.slug}`);
  const chips = page
    .getByRole("list", { name: "Applied filters" })
    .getByRole("button", { name: /^Remove / });
  await expect(chips).toHaveCount(2);
  await chips.first().click();
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toBeFocused();
});

test("dedicated search commits on submit rather than while typing", async ({ page }) => {
  await page.goto("/search");
  const input = page.getByRole("searchbox", {
    name: "Search furniture, rooms, materials, and styles",
  });
  await input.fill(searchQuery);
  await expect(page).toHaveURL(/\/search$/);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=walnut(?:%2C|,)\+desk/);
  await expect(page.locator("main article")).toHaveCount(1);
});

test("four-product category grids remain balanced at tablet width", async ({ page }) => {
  expect(categoryProducts).toHaveLength(4);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`/shop/${category.slug}`);
  const rows = await page.locator("main article").evaluateAll((cards) =>
    cards.map((card) => Math.round(card.getBoundingClientRect().top)),
  );
  expect(new Set(rows.slice(0, 2)).size).toBe(1);
  expect(new Set(rows.slice(2)).size).toBe(1);
  expect(rows[2]).toBeGreaterThan(rows[0]);
});

test("product gallery identifies reference photography", async ({ page }) => {
  await page.goto(`/products/${searchProduct.slug}`);
  await expect(page.getByText(`Reference image for ${searchProduct.name}; not an exact catalog product.`)).toBeVisible();
  await expect(page.getByText(/Saved selections stay in this browser for 30 days/)).toBeVisible();
  await expect(page.locator("main figure img").first()).toHaveAttribute("fetchpriority", "high");
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);

  const alternate = searchProduct.images.find((image) => image.role !== "hero");
  if (!alternate) throw new Error("Product requires alternate gallery media.");
  const index = searchProduct.images.indexOf(alternate);
  await page.getByRole("button", { name: `Show image ${index + 1} of ${searchProduct.images.length}` }).click();
  await expect(page.locator('[class*="stageMedia"]')).toHaveAttribute("data-primary-image-id", alternate.id);
});

test("product cards keep unique shared-media identities", async ({ page }) => {
  await instrumentViewTransitions(page);
  await page.goto("/shop?entry=product");
  const sourceMedia = page.locator('[data-shared-media-name^="shared-media-product-"]');
  await expect(sourceMedia).toHaveCount(catalog.products.length);
  const names = await sourceMedia.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-shared-media-name")),
  );
  expect(new Set(names).size).toBe(names.length);

  const target = catalog.products[0];
  const transitionName = `shared-media-product-${target.slug}`;
  const baseline = await getViewTransitionBaseline(page);
  await page.getByRole("link", { name: target.name, exact: true }).click();
  await expect(page).toHaveURL(`/products/${target.slug}`);
  await expectViewTransitionActivation(page, baseline, transitionName);
  await expect(page.locator(`[data-shared-media-name="${transitionName}"]`)).toBeVisible();
});

test("an unknown product returns the application 404", async ({ page }) => {
  const response = await page.goto("/products/not-a-real-product");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
