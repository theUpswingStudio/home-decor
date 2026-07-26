import { expect, test } from "@playwright/test";

test("homepage exposes landmarks, navigation, sized images, and no overflow", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vestrel / House, home" }).first()).toBeVisible();
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);

  const images = page.locator("main img:visible");
  await expect.poll(() => images.count()).toBeGreaterThan(0);
  const imageDimensions = await images.evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement;
      const bounds = image.getBoundingClientRect();
      return { src: image.currentSrc || image.src, width: bounds.width, height: bounds.height };
    }),
  );
  expect(imageDimensions.filter((image) => image.width <= 0 || image.height <= 0)).toEqual([]);

  const horizontalOverflow = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollWidth - window.innerWidth,
      document.body.scrollWidth - window.innerWidth,
    ),
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  const expectedDestinations = [
    "/shop",
    "/rooms",
    "/looks",
    "/collections",
    "/design-services",
  ];
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    const navigationLinks = page
      .getByRole("dialog", { name: "Main menu" })
      .getByRole("link");
    await expect(navigationLinks).toHaveCount(expectedDestinations.length);
    expect(await navigationLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(
      expectedDestinations,
    );
    await navigationLinks.first().click();
  } else {
    const navigationLinks = page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link");
    await expect(navigationLinks).toHaveCount(expectedDestinations.length);
    expect(await navigationLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(
      expectedDestinations,
    );
    await navigationLinks.first().click();
  }

  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("mobile menu supports keyboard open, focus containment, Escape, and focus return", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile navigation is only rendered at the mobile breakpoint.");
  await page.goto("/");

  const trigger = page.locator(
    'button[aria-controls="mobile-navigation-panel"]',
  );
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const dialog = page.getByRole("dialog", { name: "Main menu" });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page.getByRole("main")).toHaveAttribute("inert", "");
  await expect(page.locator(".site-header .site-wordmark")).toHaveAttribute("inert", "");
  await expect(page.locator('.site-header__utility-link[aria-label="Search"]')).toHaveAttribute("inert", "");
  const firstLink = dialog.getByRole("link").first();
  await expect(firstLink).toBeFocused();

  await dialog.getByRole("link").last().focus();
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Main menu" })).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("main")).not.toHaveAttribute("inert", "");
  await expect(page.locator(".site-header .site-wordmark")).not.toHaveAttribute("inert", "");
  await expect(page.locator('.site-header__utility-link[aria-label="Search"]')).not.toHaveAttribute("inert", "");
  await expect(page.locator("body")).not.toHaveAttribute("style", /overflow:\s*hidden/);
});

test("homepage hero stacks at 768px", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");

  const columnTracks = await page.locator('[class*="heroInner"]').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean),
  );
  expect(columnTracks).toHaveLength(1);
});
