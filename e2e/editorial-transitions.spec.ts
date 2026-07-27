import { expect, test } from "@playwright/test";
import { catalog } from "../src/data/catalog";
import {
  expectViewTransitionActivation,
  getViewTransitionBaseline,
  instrumentViewTransitions,
} from "./view-transition";

const routePairs = [
  {
    kind: "room",
    index: "/rooms",
    parentLabel: "Rooms",
    slug: catalog.rooms[0].slug,
  },
  {
    kind: "look",
    index: "/looks",
    parentLabel: "The lookbook",
    slug: catalog.looks[0].slug,
  },
  {
    kind: "collection",
    index: "/collections",
    parentLabel: "Collections",
    slug: catalog.collections[0].slug,
  },
] as const;

for (const pair of routePairs) {
  test(`${pair.kind} landing media matches detail media identities`, async ({
    page,
  }) => {
    await instrumentViewTransitions(page);
    const transitionName = `shared-media-${pair.kind}-${pair.slug}`;
    await page.goto(pair.index);
    const source = page.locator(`[data-shared-media-name="${transitionName}"]`);
    await expect(source).toHaveCount(1);
    const sourceImageId = await source.getAttribute("data-primary-image-id");
    const transitionBaseline = await getViewTransitionBaseline(page);
    await source.locator("xpath=ancestor::a").click();
    await expect(page).toHaveURL(`${pair.index}/${pair.slug}`);
    await expectViewTransitionActivation(
      page,
      transitionBaseline,
      transitionName,
    );

    const destination = page.locator(
      `[data-shared-media-name="${transitionName}"]`,
    );
    await expect(destination).toHaveCount(1);
    await expect(destination).toHaveAttribute(
      "data-primary-image-id",
      sourceImageId ?? "",
    );
    const bounds = await destination.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);

    const reverseBaseline = await getViewTransitionBaseline(page);
    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", {
        name: pair.parentLabel,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(pair.index);
    await expectViewTransitionActivation(
      page,
      reverseBaseline,
      transitionName,
    );
  });
}

test("homepage shared media names are unique and exclude the hero", async ({ page }) => {
  await page.goto("/");
  const names = await page
    .locator("[data-shared-media-name]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-shared-media-name")),
    );
  expect(new Set(names).size).toBe(names.length);
  await expect(
    page.locator('[class*="heroPrimaryImage"][data-shared-media-name]'),
  ).toHaveCount(0);
});
