import { expect, test } from "@playwright/test";
import { catalog } from "../src/data/catalog";

const product = catalog.products.find((candidate) => {
  const variants = candidate.variantIds.flatMap((id) =>
    catalog.variants.filter((variant) => variant.id === id),
  );
  return (
    variants.length > 1 &&
    new Set(
      variants.map(
        (variant) =>
          `${variant.priceMinor}:${JSON.stringify(variant.overallDimensions)}`,
      ),
    ).size > 1
  );
});

if (!product) throw new Error("The catalog needs a product with distinct variants.");

test("PDP selection adds to the persistent cart and cart controls update state", async ({
  page,
}) => {
  await page.goto(`/products/${product.slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: product.name }),
  ).toBeVisible();

  const choices = page.locator('input[name="variant"]');
  await expect(choices).toHaveCount(product.variantIds.length);
  const summary = page.locator('dl[aria-live="polite"]');
  const initialSummary = await summary.textContent();
  await choices.nth(1).check();
  await expect(choices.nth(1)).toBeChecked();
  await expect(summary).not.toHaveText(initialSummary ?? "");

  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByText(
      `${product.name} added to cart. Quantity 1; 1 item total.`,
      { exact: true },
    ),
  ).toBeVisible();
  const cartLink = page.getByRole("link", { name: /^Cart,/ });
  await expect(cartLink).toHaveAccessibleName("Cart, 1 item");

  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByText(
      `${product.name} added to cart. Quantity 2; 2 items total.`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(cartLink).toHaveAccessibleName("Cart, 2 items");

  await page.reload();
  await expect(cartLink).toHaveAccessibleName("Cart, 2 items");
  await cartLink.click();

  const quantity = page.getByLabel("Quantity");
  await expect(quantity).toHaveValue("2");
  await quantity.fill("3");
  await expect(quantity).toHaveValue("3");
  await expect(cartLink).toHaveAccessibleName("Cart, 3 items");

  await page.getByRole("button", { name: "Clear all selections" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "All cart selections cleared.",
  );
  await expect(cartLink).toHaveAccessibleName("Cart, 0 items");
  const emptyHeading = page.getByRole("heading", { name: "Nothing is set aside yet." });
  await expect(emptyHeading).toBeVisible();
  await expect(emptyHeading).toBeFocused();
});

test("add to cart reports a quantity-limit no-op", async ({ page }) => {
  const variantId = product.variantIds[0];
  await page.addInitScript(
    ({ storageKey, savedVariantId, maxQuantity }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          items: [{ variantId: savedVariantId, quantity: maxQuantity }],
        }),
      );
    },
    {
      storageKey: "vestrel-house:cart",
      savedVariantId: variantId,
      maxQuantity: 99,
    },
  );

  await page.goto(`/products/${product.slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();

  await expect(
    page.getByRole("status"),
  ).toHaveText(`${product.name} is already at the maximum quantity of 99.`);
  await expect(page.getByRole("link", { name: /^Cart,/ })).toHaveAccessibleName(
    "Cart, 99 items",
  );
});

test("cart quantity control reports a clamped no-op truthfully", async ({
  page,
}) => {
  const variantId = product.variantIds[0];
  await page.addInitScript(
    ({ storageKey, savedVariantId }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          items: [{ variantId: savedVariantId, quantity: 99 }],
        }),
      );
    },
    { storageKey: "vestrel-house:cart", savedVariantId: variantId },
  );

  await page.goto("/cart");
  const quantity = page.getByLabel("Quantity");
  await quantity.fill("100");

  await expect(quantity).toHaveValue("99");
  await expect(page.getByRole("status")).toHaveText(
    `${product.name} quantity remains at 99.`,
  );
});

test("the full cart drops persisted variants that no longer resolve", async ({
  page,
}) => {
  const variantId = product.variantIds[0];
  await page.addInitScript(
    ({ storageKey, savedVariantId }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          items: [
            { variantId: savedVariantId, quantity: 2 },
            { variantId: "deleted-variant", quantity: 3 },
          ],
        }),
      );
    },
    { storageKey: "vestrel-house:cart", savedVariantId: variantId },
  );

  await page.goto("/");
  const cartLink = page.getByRole("link", { name: /^Cart,/ });
  await expect(cartLink).toHaveAccessibleName("Cart, 5 items");

  await page.goto("/cart");
  await expect(page.getByLabel("Quantity")).toHaveValue("2");
  await expect(cartLink).toHaveAccessibleName("Cart, 2 items");
  await expect
    .poll(async () =>
      page.evaluate((storageKey) => {
        const value = window.localStorage.getItem(storageKey);
        return value ? JSON.parse(value).items : null;
      }, "vestrel-house:cart"),
    )
    .toEqual([{ variantId, quantity: 2 }]);
});

test("a late cross-tab removal recovers focus and announces the stale action", async ({
  page,
}) => {
  const variant = catalog.variants.find(
    (candidate) => candidate.id === product.variantIds[0],
  )!;
  const otherProduct = catalog.products.find(
    (candidate) => candidate.id !== product.id,
  )!;
  const otherVariant = catalog.variants.find(
    (candidate) => candidate.id === otherProduct.variantIds[0],
  )!;
  await page.addInitScript(
    ({ storageKey, items }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ version: 1, updatedAt: Date.now(), items }),
      );
    },
    {
      storageKey: "vestrel-house:cart",
      items: [
        { variantId: variant.id, quantity: 1 },
        { variantId: otherVariant.id, quantity: 1 },
      ],
    },
  );
  await page.goto("/cart");
  const staleRemove = page.getByRole("button", {
    name: `Remove ${product.name}`,
  });
  await expect(staleRemove).toBeVisible();

  await staleRemove.evaluate(
    (button, { storageKey, remainingVariantId }) => {
      const previousValue = window.localStorage.getItem(storageKey);
      const nextValue = JSON.stringify({
        version: 1,
        updatedAt: Date.now() + 1_000,
        items: [{ variantId: remainingVariantId, quantity: 1 }],
      });
      window.localStorage.setItem(
        storageKey,
        nextValue,
      );
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: storageKey,
          oldValue: previousValue,
          newValue: nextValue,
          storageArea: window.localStorage,
          url: window.location.href,
        }),
      );
      (button as HTMLButtonElement).click();
    },
    {
      storageKey: "vestrel-house:cart",
      remainingVariantId: otherVariant.id,
    },
  );

  await expect(page.getByRole("status")).toHaveText(
    new RegExp(
      `^${product.name}, SKU ${variant.sku}, (?:was already )?removed from cart\\.$`,
    ),
  );
  await expect(
    page.getByRole("button", { name: `Remove ${otherProduct.name}` }),
  ).toBeFocused();
});
