import { describe, expect, it } from "vitest";
import { getCatalogSelection } from "@/components/catalog/catalog-selection";
import {
  catalog,
  filterProducts,
  formatPrice,
  formatProductPrice,
  getProductPriceRange,
  searchProducts,
  sortProducts,
  validateCatalog,
} from "@/lib/catalog";

describe("catalog integrity", () => {
  it("is valid and contains exactly 24 products", () => {
    expect(validateCatalog(catalog)).toEqual({ valid: true, errors: [] });
    expect(catalog.products).toHaveLength(24);
  });

  it("has globally unique entities and reachable relationships", () => {
    const entities = [
      ...catalog.navigation,
      ...catalog.policies,
      ...catalog.categories,
      ...catalog.rooms,
      ...catalog.collections,
      ...catalog.looks,
      ...catalog.products,
      ...catalog.variants,
      ...catalog.sampleReviews,
    ];
    const ids = entities.map((entity) => entity.id);
    expect(new Set(ids).size).toBe(ids.length);

    const productIds = new Set(catalog.products.map((product) => product.id));
    const variantIds = new Set(catalog.variants.map((variant) => variant.id));
    const categoryIds = new Set(catalog.categories.map((category) => category.id));
    const roomIds = new Set(catalog.rooms.map((room) => room.id));
    const collectionIds = new Set(
      catalog.collections.map((collection) => collection.id),
    );

    for (const product of catalog.products) {
      expect(categoryIds.has(product.categoryId)).toBe(true);
      expect(product.roomIds.every((id) => roomIds.has(id))).toBe(true);
      expect(
        product.collectionIds.every((id) => collectionIds.has(id)),
      ).toBe(true);
      expect(product.variantIds.every((id) => variantIds.has(id))).toBe(true);
      expect(product.complementIds.every((id) => productIds.has(id))).toBe(true);
      expect(product.complementIds).not.toContain(product.id);
    }

    for (const variant of catalog.variants) {
      const owner = catalog.products.find(
        (product) => product.id === variant.productId,
      );
      expect(owner?.variantIds).toContain(variant.id);
    }
  });

  it("labels every sample review and links it to exactly one product", () => {
    const referencedReviewIds = catalog.products.flatMap(
      (product) => product.sampleReviewIds ?? [],
    );

    expect(new Set(referencedReviewIds).size).toBe(referencedReviewIds.length);
    expect(new Set(referencedReviewIds)).toEqual(
      new Set(catalog.sampleReviews.map((review) => review.id)),
    );

    for (const review of catalog.sampleReviews) {
      expect(review.isSample).toBe(true);
      expect(review.disclosure.toLowerCase()).toContain("fictional sample");
      expect(
        catalog.products.find((product) => product.id === review.productId)
          ?.sampleReviewIds,
      ).toContain(review.id);
    }
  });
});

describe("catalog selection", () => {
  it("searches all terms and returns a copy for an empty query", () => {
    expect(searchProducts("Vale Modular Sofa").map((product) => product.slug)).toEqual([
      "vale-modular-sofa",
    ]);
    expect(searchProducts("walnut writing desk").map((product) => product.slug)).toEqual([
      "axis-writing-desk",
    ]);

    const unfiltered = searchProducts("", catalog.products);
    expect(unfiltered).toEqual(catalog.products);
    expect(unfiltered).not.toBe(catalog.products);
  });

  it("applies known route filters and rejects unknown values", () => {
    const selection = getCatalogSelection({
      category: ["sofas-sectionals", "not-a-category"],
      sort: "name",
    });

    expect(selection.active.category).toEqual(["sofas-sectionals"]);
    expect(selection.sort).toBe("name");
    expect(selection.products.map((product) => product.slug)).toEqual([
      "canto-chaise-sectional",
      "morrow-apartment-sofa",
      "nila-upholstered-daybed",
      "vale-modular-sofa",
    ]);
    expect(getCatalogSelection({ sort: "not-a-sort" }).sort).toBe("featured");
  });

  it("keeps free-text queries intact while splitting multi-value filters", () => {
    const selection = getCatalogSelection({
      query: "walnut, desk",
      material: "wood,metal",
    });

    expect(selection.active.query).toEqual(["walnut, desk"]);
    expect(selection.active.material).toEqual(["wood", "metal"]);
    expect(selection.products.map((product) => product.slug)).toEqual([
      "axis-writing-desk",
    ]);
  });

  it("filters materials and price ranges with overlap semantics", () => {
    const walnutProducts = filterProducts({ materials: ["walnut"] });
    expect(walnutProducts.length).toBeGreaterThan(0);
    expect(
      walnutProducts.every((product) =>
        product.materials.some((material) =>
          material.toLowerCase().includes("walnut"),
        ),
      ),
    ).toBe(true);

    const under1500 = filterProducts({ maximumPriceMinor: 150_000 });
    expect(under1500.length).toBeGreaterThan(0);
    expect(
      under1500.every(
        (product) =>
          (getProductPriceRange(product)?.minimumMinor ?? Infinity) <= 150_000,
      ),
    ).toBe(true);
  });

  it("sorts by name, date, and price without mutating its input", () => {
    const input = catalog.products.slice(0, 8);
    const originalIds = input.map((product) => product.id);

    const byName = sortProducts(input, "name");
    expect(byName.map((product) => product.name)).toEqual(
      input.map((product) => product.name).toSorted((left, right) =>
        left.localeCompare(right),
      ),
    );

    const byNewest = sortProducts(input, "newest");
    expect(byNewest.map((product) => Date.parse(product.publishedAt))).toEqual(
      input
        .map((product) => Date.parse(product.publishedAt))
        .toSorted((left, right) => right - left),
    );

    const ascendingPrices = sortProducts(input, "price-asc").map(
      (product) => getProductPriceRange(product)?.minimumMinor ?? Infinity,
    );
    expect(ascendingPrices).toEqual(
      ascendingPrices.toSorted((left, right) => left - right),
    );
    expect(input.map((product) => product.id)).toEqual(originalIds);
  });
});

describe("price formatting", () => {
  it("formats whole and fractional US dollar prices", () => {
    expect(formatPrice(125_000)).toBe("$1,250");
    expect(formatPrice(125_050)).toBe("$1,250.50");
    expect(formatProductPrice("prod-vale-sofa")).toMatch(/^\$[\d,]+(?:–\$[\d,]+)?$/);
  });

  it("rejects invalid minor-unit values", () => {
    expect(() => formatPrice(-1)).toThrow(RangeError);
    expect(() => formatPrice(10.5)).toThrow(RangeError);
  });
});
