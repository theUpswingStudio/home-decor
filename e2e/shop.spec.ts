import { expect, test } from "@playwright/test";
import { catalog } from "../src/data/catalog";

const category = catalog.categories[0];
const categoryProducts = catalog.products.filter(
  (candidate) => candidate.categoryId === category.id,
);
const searchQuery = "walnut, desk";
const searchProduct = catalog.products.find(
  (candidate) => candidate.slug === "axis-writing-desk",
)!;

test("shop search, filters, and category routes select known products", async ({
  page,
  isMobile,
}) => {
  await page.goto("/shop");
  await expect(page.locator("main article")).toHaveCount(24);

  if (isMobile) {
    await page.getByRole("button", { name: "Filters" }).click();
  }
  const prefix = isMobile ? "mobile" : "desktop";
  const filterForm = page.locator(`form:has(#${prefix}-query)`);
  await page.locator(`#${prefix}-query`).fill(searchQuery);
  await expect(page).toHaveURL(/\/shop$/);
  await filterForm.getByRole("button", { name: "Update results" }).click();
  await expect(page).toHaveURL(new RegExp(`query=${encodeURIComponent(searchQuery).replaceAll("%20", "(?:%20|\\+)")}`));
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.getByRole("link", { name: searchProduct.name, exact: true })).toBeVisible();
  await expect(page.getByText("Reference image", { exact: true })).toBeVisible();
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0);
  await expect(page.locator('main article img[fetchpriority="high"]')).toHaveCount(1);

  if (isMobile) {
    await expect(page.getByRole("dialog", { name: "Filter products" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Filters (1)" })).toBeFocused();
    await expect(page.locator("body")).not.toHaveAttribute("style", /overflow:\s*hidden/);
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.locator("main article")).toHaveCount(24);
  if (isMobile) {
    await page.getByRole("button", { name: "Filters" }).click();
  }
  await page
    .locator(`#${prefix}-category-${category.slug}`)
    .check();
  if (isMobile) {
    await expect(page).toHaveURL(/\/shop$/);
    await filterForm.getByRole("button", { name: "Update results" }).click();
    await expect(page.getByRole("dialog", { name: "Filter products" })).toHaveCount(0);
  }
  await expect(page).toHaveURL(new RegExp(`category=${category.slug}`));
  await expect(page.locator("main article")).toHaveCount(categoryProducts.length);

  await page.goto(`/shop/${category.slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: category.name }),
  ).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(categoryProducts.length);
});

test("dedicated search commits on submit rather than while typing", async ({ page }) => {
  await page.goto("/search");
  const input = page.getByRole("searchbox", {
    name: "Search furniture, rooms, materials, and styles",
  });

  await input.fill(searchQuery);
  await expect(page).toHaveURL(/\/search$/);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(searchQuery).replaceAll("%20", "(?:%20|\\+)")}`));
  await expect(page.locator("main article")).toHaveCount(1);
  await expect(page.getByRole("link", { name: searchProduct.name, exact: true })).toBeVisible();
});

test("four-product category grids remain balanced at tablet width", async ({ page }) => {
  expect(categoryProducts).toHaveLength(4);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`/shop/${category.slug}`);

  const rowPositions = await page.locator("main article").evaluateAll((cards) =>
    cards.map((card) => Math.round(card.getBoundingClientRect().top)),
  );
  expect(new Set(rowPositions.slice(0, 2)).size).toBe(1);
  expect(new Set(rowPositions.slice(2)).size).toBe(1);
  expect(rowPositions[2]).toBeGreaterThan(rowPositions[0]);
});

test("product gallery identifies reference photography without repeated preloads", async ({ page }) => {
  await page.goto(`/products/${searchProduct.slug}`);
  await expect(
    page.getByText(`Reference image for ${searchProduct.name}; not an exact catalog product.`),
  ).toBeVisible();
  await expect(page.locator("main figure img").first()).toHaveAttribute("fetchpriority", "high");
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);

  const secondImage = page.getByRole("button", { name: /Show image 2 of/ });
  if (await secondImage.count()) await secondImage.click();
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);
});

test("an unknown product returns the application 404", async ({ page }) => {
  const response = await page.goto("/products/not-a-real-product");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const robotsDirectives = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content") ?? ""),
    );
  expect(robotsDirectives.length).toBeGreaterThan(0);
  expect(robotsDirectives.every((content) => /noindex/i.test(content))).toBe(true);
});
