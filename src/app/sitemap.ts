import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/components/seo/site-url";
import { catalog } from "@/lib/catalog";

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;

function latestDate(dates: readonly string[]): Date {
  return new Date(Math.max(...dates.map((date) => Date.parse(date))));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const catalogDate = latestDate(catalog.products.map((product) => product.publishedAt));
  const entry = (
    path: string,
    lastModified: Date | undefined,
    changeFrequency: ChangeFrequency,
    priority: number,
  ): SitemapEntry => ({
    url: new URL(path, siteUrl).toString(),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  });
  const productsForIds = (ids: readonly string[]) =>
    catalog.products.filter((product) => ids.includes(product.id));

  const staticPages = [
    "/about",
    "/contact",
    "/shipping-returns",
    "/care",
    "/faq",
    "/privacy",
    "/terms",
    "/accessibility",
    "/design-services",
  ].map((path) => entry(path, undefined, "yearly", 0.5));

  return [
    entry("/", catalogDate, "weekly", 1),
    entry("/shop", catalogDate, "weekly", 0.9),
    entry("/rooms", catalogDate, "monthly", 0.8),
    entry("/collections", catalogDate, "monthly", 0.8),
    entry("/looks", catalogDate, "monthly", 0.8),
    ...staticPages,
    ...catalog.products.map((product) =>
      entry(`/products/${product.slug}`, new Date(product.publishedAt), "monthly", 0.8),
    ),
    ...catalog.categories.map((category) =>
      entry(
        `/shop/${category.slug}`,
        latestDate(
          catalog.products
            .filter((product) => product.categoryId === category.id)
            .map((product) => product.publishedAt),
        ),
        "monthly",
        0.7,
      ),
    ),
    ...catalog.rooms.map((room) =>
      entry(
        `/rooms/${room.slug}`,
        latestDate(
          catalog.products
            .filter((product) => product.roomIds.includes(room.id))
            .map((product) => product.publishedAt),
        ),
        "monthly",
        0.7,
      ),
    ),
    ...catalog.collections.map((collection) =>
      entry(
        `/collections/${collection.slug}`,
        latestDate(
          catalog.products
            .filter((product) => product.collectionIds.includes(collection.id))
            .map((product) => product.publishedAt),
        ),
        "monthly",
        0.7,
      ),
    ),
    ...catalog.looks.map((look) =>
      entry(
        `/looks/${look.slug}`,
        latestDate(productsForIds(look.productIds).map((product) => product.publishedAt)),
        "monthly",
        0.7,
      ),
    ),
  ];
}
