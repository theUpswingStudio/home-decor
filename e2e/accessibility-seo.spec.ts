import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { catalog } from "../src/data/catalog";

const representativeProduct = catalog.products[0];
const accessibilityPaths = [
  "/",
  "/shop",
  `/products/${representativeProduct.slug}`,
  "/project-edit",
  "/design-services/inquire",
];

test("core pages have no serious or critical Axe violations", async ({ page }) => {
  const findings: Array<{
    path: string;
    id: string;
    impact: string | null | undefined;
    help: string;
    targets: unknown[];
  }> = [];

  for (const path of accessibilityPaths) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const result = await new AxeBuilder({ page }).analyze();
    findings.push(
      ...result.violations
        .filter((violation) =>
          violation.impact === "serious" || violation.impact === "critical",
        )
        .map((violation) => ({
          path,
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.flatMap((node) => node.target),
        })),
    );
  }

  expect(findings, "Serious or critical Axe violations").toEqual([]);
});

test("metadata, indexing endpoints, and JSON-LD are internally consistent", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Vestrel House/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /\S+/,
  );

  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).not.toBeNull();
  const canonicalUrl = new URL(canonical ?? "");
  expect(canonicalUrl.protocol).toBe("https:");
  expect(canonicalUrl.pathname).toBe("/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    catalog.site.seo.title,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonicalUrl.origin,
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    catalog.site.seo.title,
  );

  const website = JSON.parse(
    (await page.locator("#website-json-ld").textContent()) ?? "null",
  ) as Record<string, unknown>;
  expect(website["@context"]).toBe("https://schema.org");
  expect(website["@type"]).toBe("WebSite");
  expect(website.url).toBe(canonicalUrl.toString());

  await page.goto(`/products/${representativeProduct.slug}`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new URL(`/products/${representativeProduct.slug}`, canonicalUrl).toString(),
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    representativeProduct.seo.title,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    new URL(`/products/${representativeProduct.slug}`, canonicalUrl).toString(),
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    representativeProduct.seo.title,
  );
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  await expect(page.locator("#product-json-ld")).toHaveCount(0);
  const breadcrumbs = JSON.parse(
    (await page.locator("#product-breadcrumb-json-ld").textContent()) ?? "null",
  ) as { itemListElement?: unknown[] };
  expect(breadcrumbs.itemListElement?.length).toBeGreaterThanOrEqual(3);

  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.status()).toBe(200);
  const robots = await robotsResponse.text();
  const robotsMeta = await page.locator('meta[name="robots"]').getAttribute("content");
  if (/Disallow:\s*\//i.test(robots)) {
    expect(robotsMeta).toMatch(/noindex/i);
    expect(robotsMeta).toMatch(/nofollow/i);
  } else {
    expect(robots).toMatch(/Allow:\s*\//i);
    expect(robots).toContain(new URL("/sitemap.xml", canonicalUrl).toString());
  }

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  expect(sitemapResponse.headers()["content-type"]).toContain("xml");
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain(`<loc>${canonicalUrl.toString()}</loc>`);
  for (const product of catalog.products) {
    expect(sitemap).toContain(
      `<loc>${new URL(`/products/${product.slug}`, canonicalUrl).toString()}</loc>`,
    );
  }

  for (const path of [
    "/about",
    "/contact",
    "/shipping-returns",
    "/care",
    "/faq",
    "/privacy",
    "/terms",
    "/accessibility",
    "/design-services",
  ]) {
    const url = new URL(path, canonicalUrl).toString();
    const sitemapEntry = sitemap
      .split("<url>")
      .find((candidate) => candidate.includes(`<loc>${url}</loc>`))
      ?.split("</url>")[0];
    expect(sitemapEntry, `Sitemap entry for ${path}`).toBeDefined();
    expect(sitemapEntry).not.toContain("<lastmod>");
  }
});

test("owned utility routes are noindex, follow with route-specific social metadata", async ({
  page,
}) => {
  const routes = [
    { path: "/search", title: "Search the Catalog" },
    { path: "/project-edit", title: "Your Project Edit" },
    {
      path: "/design-services/inquire",
      title: "Design Consultation Inquiry",
    },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, follow/i,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      route.title,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      new RegExp(`${route.path.replaceAll("/", "\\/")}$`),
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      route.title,
    );
  }
});
