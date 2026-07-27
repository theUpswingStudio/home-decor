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

test("homepage hero title stays clear of the visual on desktop", async ({ page }) => {
  for (const width of [1025, 1217, 1440, 1707, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");

    const heroTitle = page.getByRole("heading", { level: 1 });
    const measurements = await heroTitle.evaluate((title) => {
      const copy = title.closest('[class*="heroCopy"]');
      const visual = title.closest("section")?.querySelector('[class*="heroVisual"]');
      if (!copy || !visual) throw new Error("Hero layout elements not found");

      const spanRights = Array.from(title.querySelectorAll("span"), (span) =>
        span.getBoundingClientRect().right,
      );
      const titleRight = Math.max(...spanRights);
      const copyRight = copy.getBoundingClientRect().right;
      const visualBounds = visual.getBoundingClientRect();
      const lineCounts = Array.from(title.querySelectorAll("span"), (span) => {
        const range = document.createRange();
        range.selectNodeContents(span);
        return range.getClientRects().length;
      });

      return {
        spanRights,
        titleRight,
        copyRight,
        copyOverflow: titleRight - copyRight,
        visualLeft: visualBounds.left,
        imageGap: visualBounds.left - titleRight,
        lineCounts,
      };
    });

    expect(measurements.lineCounts, `${width}px title lines`).toEqual([1, 1]);
    for (const [index, spanRight] of measurements.spanRights.entries()) {
      expect.soft(
        spanRight,
        `${width}px title span ${index + 1} containment: ${JSON.stringify(measurements)}`,
      ).toBeLessThanOrEqual(measurements.copyRight + 1);
    }
    expect.soft(
      measurements.titleRight,
      `${width}px hero bounds: ${JSON.stringify(measurements)}`,
    ).toBeLessThanOrEqual(measurements.visualLeft);
  }
});

test("mobile hero title stays on two lines without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");

  const lineCounts = await page.getByRole("heading", { level: 1 }).evaluate((title) =>
    Array.from(title.querySelectorAll("span"), (span) => {
      const range = document.createRange();
      range.selectNodeContents(span);
      return range.getClientRects().length;
    }),
  );
  const horizontalOverflow = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollWidth - window.innerWidth,
      document.body.scrollWidth - window.innerWidth,
    ),
  );

  expect(lineCounts).toEqual([1, 1]);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test("look carousel exposes all catalog looks and stops at its boundaries", async ({
  page,
}) => {
  await page.goto("/");

  const carousel = page.getByRole("region", { name: "Collected looks" });
  const lookControls = carousel.getByRole("group", { name: "Choose a look" });
  const previous = carousel.getByRole("button", { name: "Previous" });
  const next = carousel.getByRole("button", { name: "Next" });
  const status = carousel.locator('[aria-live="polite"]');

  await expect(lookControls.getByRole("button")).toHaveText([
    "Look 1",
    "Look 2",
    "Look 3",
    "Look 4",
  ]);
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(carousel.locator('#look-slide-1')).not.toHaveAttribute("inert", "");
  await expect(carousel.locator('#look-slide-2')).toHaveAttribute("inert", "");

  const completeLookLinks = carousel.locator("a").filter({
    hasText: "View the complete look",
  });
  expect(await completeLookLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "/looks/warm-monolith",
    "/looks/gallery-calm",
    "/looks/tailored-contrast",
    "/looks/quiet-color",
  ]);

  await lookControls.getByRole("button", { name: "Look 4" }).click();
  await expect(status).toHaveText("Showing Look 4 of 4: Quiet Color");
  await expect(lookControls.getByRole("button", { name: "Look 4" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(next).toBeDisabled();
  await expect(previous).toBeEnabled();
  await expect(carousel.locator('#look-slide-3')).toHaveAttribute("inert", "");
  await expect(carousel.locator('#look-slide-4')).not.toHaveAttribute("inert", "");

  await previous.click();
  await expect(status).toHaveText("Showing Look 3 of 4: Tailored Contrast");
  await expect(next).toBeEnabled();

  await lookControls.getByRole("button", { name: "Look 1" }).click();
  await expect(status).toHaveText("Showing Look 1 of 4: Warm Monolith");
  await expect(previous).toBeDisabled();
});

test("editorial home sections use deliberate responsive grids without overflow", async ({
  page,
}) => {
  const cases = [
    { width: 390, columns: 1, consultationColumns: 1 },
    { width: 768, columns: 1, consultationColumns: 1 },
    { width: 769, columns: 2, consultationColumns: 12 },
    { width: 1024, columns: 2, consultationColumns: 12 },
    { width: 1440, columns: 12, consultationColumns: 12 },
  ];

  for (const testCase of cases) {
    await page.setViewportSize({ width: testCase.width, height: 1000 });
    await page.goto("/");

    const roomColumns = await page.locator('[class*="roomGrid"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean),
    );
    const productColumns = await page.locator('[class*="productGrid"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean),
    );
    const consultationColumns = await page.locator('[class*="consultationInner"]').evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean),
    );

    expect(roomColumns, `${testCase.width}px room grid`).toHaveLength(testCase.columns);
    expect(productColumns, `${testCase.width}px product grid`).toHaveLength(testCase.columns);
    expect(consultationColumns, `${testCase.width}px consultation grid`).toHaveLength(
      testCase.consultationColumns,
    );

    const horizontalOverflow = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollWidth - window.innerWidth,
        document.body.scrollWidth - window.innerWidth,
      ),
    );
    expect(horizontalOverflow, `${testCase.width}px horizontal overflow`).toBeLessThanOrEqual(1);
  }
});

test("stretched editorial cards keep media directly joined to their captions", async ({
  page,
}) => {
  for (const width of [769, 1024, 1440, 1707]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");

    const roomCards = page.locator('section[aria-labelledby="rooms-title"] article');
    const productCards = page.locator('section[aria-labelledby="featured-title"] article');
    const roomGaps = await roomCards
      .evaluateAll((cards) =>
        cards.map((card) => {
          const image = card.querySelector('[class*="roomImageFrame"]');
          const caption = card.querySelector('[class*="roomCaption"]');
          if (!image || !caption) return Number.POSITIVE_INFINITY;
          return caption.getBoundingClientRect().top - image.getBoundingClientRect().bottom;
        }),
      );
    const productGaps = await productCards
      .evaluateAll((cards) =>
        cards.map((card) => {
          const image = card.querySelector('[class*="imageFrame"]');
          const details = card.querySelector('[class*="details"]');
          if (!image || !details) return Number.POSITIVE_INFINITY;
          return details.getBoundingClientRect().top - image.getBoundingClientRect().bottom;
        }),
      );
    const roomBoundsViolations = await roomCards.evaluateAll((cards) =>
      cards.map((card) => {
        const frame = card.querySelector('[class*="roomImageFrame"]');
        const cardBounds = card.getBoundingClientRect();
        const frameBounds = frame?.getBoundingClientRect();
        return {
          card: card.querySelector("h3")?.textContent,
          cardLeft: cardBounds.left,
          cardRight: cardBounds.right,
          frameLeft: frameBounds?.left,
          frameRight: frameBounds?.right,
          isViolation:
            !frameBounds ||
            frameBounds.left < cardBounds.left - 1 ||
            frameBounds.right > cardBounds.right + 1,
        };
      }).filter(({ isViolation }) => isViolation),
    );
    const productBoundsViolations = await productCards.evaluateAll((cards) =>
      cards.map((card) => {
        const frame = card.querySelector('[class*="imageFrame"]');
        const cardBounds = card.getBoundingClientRect();
        const frameBounds = frame?.getBoundingClientRect();
        return {
          card: card.querySelector("h3")?.textContent,
          cardLeft: cardBounds.left,
          cardRight: cardBounds.right,
          frameLeft: frameBounds?.left,
          frameRight: frameBounds?.right,
          isViolation:
            !frameBounds ||
            frameBounds.left < cardBounds.left - 1 ||
            frameBounds.right > cardBounds.right + 1,
        };
      }).filter(({ isViolation }) => isViolation),
    );
    const roomContainmentViolations = await roomCards.evaluateAll((cards) =>
      cards.map((card) => {
        const frame = card.querySelector('[class*="roomImageFrame"]');
        const image = frame?.querySelector("img");
        const grid = card.parentElement;
        const section = card.closest("section");
        const cardBounds = card.getBoundingClientRect();
        const frameBounds = frame?.getBoundingClientRect();
        const imageBounds = image?.getBoundingClientRect();
        const gridBounds = grid?.getBoundingClientRect();
        const sectionBounds = section?.getBoundingClientRect();
        return {
          card: card.querySelector("h3")?.textContent,
          imageEscapesFrame:
            !frameBounds ||
            !imageBounds ||
            imageBounds.left < frameBounds.left - 1 ||
            imageBounds.right > frameBounds.right + 1 ||
            imageBounds.top < frameBounds.top - 1 ||
            imageBounds.bottom > frameBounds.bottom + 1,
          articleEscapesContainer:
            !gridBounds ||
            cardBounds.left < gridBounds.left - 1 ||
            cardBounds.right > gridBounds.right + 1,
          articleEscapesSection:
            !sectionBounds ||
            cardBounds.left < sectionBounds.left - 1 ||
            cardBounds.right > sectionBounds.right + 1,
        };
      }).filter(
        ({ imageEscapesFrame, articleEscapesContainer, articleEscapesSection }) =>
          imageEscapesFrame || articleEscapesContainer || articleEscapesSection,
      ),
    );
    const productContainmentViolations = await productCards.evaluateAll((cards) =>
      cards.map((card) => {
        const frame = card.querySelector('[class*="imageFrame"]');
        const image = frame?.querySelector("img");
        const grid = card.parentElement;
        const section = card.closest("section");
        const cardBounds = card.getBoundingClientRect();
        const frameBounds = frame?.getBoundingClientRect();
        const imageBounds = image?.getBoundingClientRect();
        const gridBounds = grid?.getBoundingClientRect();
        const sectionBounds = section?.getBoundingClientRect();
        return {
          card: card.querySelector("h3")?.textContent,
          imageEscapesFrame:
            !frameBounds ||
            !imageBounds ||
            imageBounds.left < frameBounds.left - 1 ||
            imageBounds.right > frameBounds.right + 1 ||
            imageBounds.top < frameBounds.top - 1 ||
            imageBounds.bottom > frameBounds.bottom + 1,
          articleEscapesContainer:
            !gridBounds ||
            cardBounds.left < gridBounds.left - 1 ||
            cardBounds.right > gridBounds.right + 1,
          articleEscapesSection:
            !sectionBounds ||
            cardBounds.left < sectionBounds.left - 1 ||
            cardBounds.right > sectionBounds.right + 1,
        };
      }).filter(
        ({ imageEscapesFrame, articleEscapesContainer, articleEscapesSection }) =>
          imageEscapesFrame || articleEscapesContainer || articleEscapesSection,
      ),
    );

    expect(roomGaps, `${width}px room media gaps`).toEqual(
      roomGaps.map(() => expect.closeTo(0, 1)),
    );
    expect(productGaps, `${width}px product media gaps`).toEqual(
      productGaps.map(() => expect.closeTo(0, 1)),
    );
    expect(roomBoundsViolations, `${width}px room media bounds`).toEqual([]);
    expect(productBoundsViolations, `${width}px product media bounds`).toEqual([]);
    expect(roomContainmentViolations, `${width}px room containment`).toEqual([]);
    expect(productContainmentViolations, `${width}px product containment`).toEqual([]);
  }
});
