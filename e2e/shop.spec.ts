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

  expect(searchProduct.images.length).toBeGreaterThan(1);
  const heroIndex = Math.max(
    searchProduct.images.findIndex((image) => image.role === "hero"),
    0,
  );
  const alternateIndex = heroIndex === 0 ? 1 : 0;
  const heroImage = searchProduct.images[heroIndex];
  const alternateImage = searchProduct.images[alternateIndex];
  const heroButton = page.getByRole("button", {
    name: `Show image ${heroIndex + 1} of ${searchProduct.images.length}`,
  });
  const alternateButton = page.getByRole("button", {
    name: `Show image ${alternateIndex + 1} of ${searchProduct.images.length}`,
  });
  const stage = page.locator('[class*="stageMedia"]');

  await alternateButton.click();
  await heroButton.click();
  await expect(stage).toHaveAttribute("data-primary-image-id", heroImage.id);
  await expect(stage.locator("img")).toHaveCount(1);

  await alternateButton.click();
  await expect(alternateButton).toHaveAttribute("aria-pressed", "true");
  await expect(stage).toHaveAttribute(
    "data-primary-image-id",
    alternateImage.id,
  );
  await expect(stage.locator("img")).toHaveCount(1);
  await expect(
    page.locator('[data-gallery-status="true"]'),
  ).toContainText(alternateImage.alt);
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);
});

test("product gallery uses its instant-swap path for reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/products/${searchProduct.slug}`);
  const alternateImage = searchProduct.images.find(
    (image) => image.role !== "hero",
  );
  if (!alternateImage) throw new Error("Product requires alternate gallery media.");
  const alternateIndex = searchProduct.images.indexOf(alternateImage);
  const stage = page.locator('[class*="stageMedia"]');

  await page
    .getByRole("button", {
      name: `Show image ${alternateIndex + 1} of ${searchProduct.images.length}`,
    })
    .click();
  await expect(stage).toHaveAttribute(
    "data-primary-image-id",
    alternateImage.id,
  );
  await expect(stage.locator("img")).toHaveCount(1);
});

test("product cards use unique shared media identities and navigate to matching PDP media", async ({ page }) => {
  await instrumentViewTransitions(page);
  await page.goto("/shop");
  const sourceMedia = page.locator('[data-shared-media-name^="shared-media-product-"]');
  await expect(sourceMedia).toHaveCount(catalog.products.length);
  const sourceNames = await sourceMedia.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-shared-media-name")),
  );
  expect(new Set(sourceNames).size).toBe(sourceNames.length);

  const target = catalog.products[0];
  const transitionName = `shared-media-product-${target.slug}`;
  const sourceImageId = await page
    .locator(`[data-shared-media-name="${transitionName}"]`)
    .getAttribute("data-primary-image-id");
  const transitionBaseline = await getViewTransitionBaseline(page);
  await page.getByRole("link", { name: target.name, exact: true }).click();
  await expect(page).toHaveURL(`/products/${target.slug}`);
  await expectViewTransitionActivation(
    page,
    transitionBaseline,
    transitionName,
  );
  const destinationMedia = page.locator(`[data-shared-media-name="${transitionName}"]`);
  await expect(destinationMedia).toHaveCount(1);
  await expect(destinationMedia).toBeVisible();
  await expect(destinationMedia).toHaveAttribute(
    "data-primary-image-id",
    sourceImageId ?? "",
  );
  const dimensions = await destinationMedia.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, overflow: getComputedStyle(element).overflow };
  });
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
  expect(dimensions.overflow).toMatch(/hidden|clip/);

  const reverseBaseline = await getViewTransitionBaseline(page);
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Shop", exact: true })
    .click();
  await expect(page).toHaveURL(/\/shop$/);
  await expectViewTransitionActivation(page, reverseBaseline, transitionName);
});

test("removing applied filters restores focus to a surviving control", async ({ page }) => {
  const categoryOption = catalog.categories[0];
  const roomOption = catalog.rooms[0];
  await page.goto(
    `/shop?category=${categoryOption.slug}&room=${roomOption.slug}`,
  );

  const chips = page
    .getByRole("list", { name: "Applied filters" })
    .getByRole("button", { name: /^Remove / });
  await expect(chips).toHaveCount(2);
  await chips.first().click();
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toBeFocused();

  await chips.first().click();
  await expect(chips).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const active = document.activeElement;
        return Boolean(
          active &&
            active !== document.body &&
            (active.hasAttribute("data-filter-clear") ||
              active.getAttribute("aria-haspopup") === "dialog" ||
              active.textContent?.trim() === "Catalog results"),
        );
      }),
    )
    .toBe(true);
});

test("filter history preserves unrelated focus when a prior chip disappears", async ({
  page,
  isMobile,
}) => {
  const categoryOption = catalog.categories[0];
  await page.goto("/shop");
  if (isMobile) {
    await page.getByRole("button", { name: "Filters", exact: true }).click();
  }
  const prefix = isMobile ? "mobile" : "desktop";
  await page.locator(`#${prefix}-category-${categoryOption.slug}`).check();
  if (isMobile) {
    await page
      .getByRole("dialog", { name: "Filter products" })
      .getByRole("button", { name: "Update results" })
      .click();
  }
  await expect(page).toHaveURL(new RegExp(`category=${categoryOption.slug}`));

  const chip = page.getByRole("button", {
    name: `Remove ${categoryOption.name}`,
  });
  await chip.focus();
  const sort = page.getByRole("combobox", { name: "Sort products" });
  await sort.focus();
  await page.goBack();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(chip).toHaveCount(0);
  await expect(sort).toBeFocused();
});

test("canceling filters after browser history restores the current URL state", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "The filter dialog is only used at the mobile breakpoint.");
  const categoryOption = catalog.categories[0];
  await page.goto("/shop");
  const trigger = page.getByRole("button", { name: "Filters", exact: true });

  await trigger.click();
  let dialog = page.getByRole("dialog", { name: "Filter products" });
  await dialog
    .locator(`#mobile-category-${categoryOption.slug}`)
    .check();
  await dialog.getByRole("button", { name: "Update results" }).click();
  await expect(page).toHaveURL(new RegExp(`category=${categoryOption.slug}`));

  await page.getByRole("button", { name: "Filters (1)" }).click();
  dialog = page.getByRole("dialog", { name: "Filter products" });
  await page.goBack();
  await expect(page).toHaveURL(/\/shop$/);
  await dialog.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("list", { name: "Applied filters" })).toHaveCount(0);
  await expect(page.locator("main article")).toHaveCount(catalog.products.length);
  await trigger.click();
  await expect(
    page
      .getByRole("dialog", { name: "Filter products" })
      .locator(`#mobile-category-${categoryOption.slug}`),
  ).not.toBeChecked();
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
