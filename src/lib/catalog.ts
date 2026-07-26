import {
  catalog,
  type Catalog,
  type CatalogImage,
  type Category,
  type Collection,
  type LinearDimensions,
  type Look,
  type Product,
  type ProductSort,
  type ProductType,
  type ProductVariant,
  type Room,
} from "../data/catalog";

export interface ProductPriceRange {
  readonly minimumMinor: number;
  readonly maximumMinor: number;
  readonly currency: "USD";
}

export interface ProductFilters {
  readonly categoryIds?: readonly string[];
  readonly roomIds?: readonly string[];
  readonly collectionIds?: readonly string[];
  readonly styleTags?: readonly string[];
  readonly materials?: readonly string[];
  readonly productTypes?: readonly ProductType[];
  readonly minimumPriceMinor?: number;
  readonly maximumPriceMinor?: number;
}

export interface ProductSelection {
  readonly query?: string;
  readonly filters?: ProductFilters;
  readonly sort?: ProductSort;
}

export interface CatalogValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

function indexById<T extends { readonly id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function indexBySlug<T extends { readonly slug: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.slug, item]));
}

const productById = indexById(catalog.products);
const productBySlug = indexBySlug(catalog.products);
const categoryById = indexById(catalog.categories);
const categoryBySlug = indexBySlug(catalog.categories);
const roomById = indexById(catalog.rooms);
const roomBySlug = indexBySlug(catalog.rooms);
const collectionById = indexById(catalog.collections);
const collectionBySlug = indexBySlug(catalog.collections);
const lookById = indexById(catalog.looks);
const lookBySlug = indexBySlug(catalog.looks);
const variantById = indexById(catalog.variants);

export function getProductById(id: string): Product | undefined {
  return productById.get(id);
}

export function getProductBySlug(slug: string): Product | undefined {
  return productBySlug.get(slug);
}

export function getCategoryById(id: string): Category | undefined {
  return categoryById.get(id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categoryBySlug.get(slug);
}

export function getRoomById(id: string): Room | undefined {
  return roomById.get(id);
}

export function getRoomBySlug(slug: string): Room | undefined {
  return roomBySlug.get(slug);
}

export function getCollectionById(id: string): Collection | undefined {
  return collectionById.get(id);
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return collectionBySlug.get(slug);
}

export function getLookById(id: string): Look | undefined {
  return lookById.get(id);
}

export function getLookBySlug(slug: string): Look | undefined {
  return lookBySlug.get(slug);
}

export function getVariantById(id: string): ProductVariant | undefined {
  return variantById.get(id);
}

export function getProductVariants(productOrId: Product | string): readonly ProductVariant[] {
  const product = typeof productOrId === "string" ? getProductById(productOrId) : productOrId;
  if (!product) return [];

  return product.variantIds.flatMap((id) => {
    const variant = variantById.get(id);
    return variant ? [variant] : [];
  });
}

export function getProductsByCategory(categoryOrId: Category | string): readonly Product[] {
  const categoryId = typeof categoryOrId === "string" ? categoryOrId : categoryOrId.id;
  return catalog.products.filter((product) => product.categoryId === categoryId);
}

export function getProductsByRoom(roomOrId: Room | string): readonly Product[] {
  const roomId = typeof roomOrId === "string" ? roomOrId : roomOrId.id;
  return catalog.products.filter((product) => product.roomIds.includes(roomId));
}

export function getProductsByCollection(collectionOrId: Collection | string): readonly Product[] {
  const collectionId = typeof collectionOrId === "string" ? collectionOrId : collectionOrId.id;
  return catalog.products.filter((product) => product.collectionIds.includes(collectionId));
}

export function getProductsByLook(lookOrId: Look | string): readonly Product[] {
  const look = typeof lookOrId === "string" ? getLookById(lookOrId) : lookOrId;
  if (!look) return [];

  return look.productIds.flatMap((id) => {
    const product = productById.get(id);
    return product ? [product] : [];
  });
}

export function getProductPriceRange(productOrId: Product | string): ProductPriceRange | undefined {
  const variants = getProductVariants(productOrId);
  if (variants.length === 0) return undefined;

  let minimumMinor = variants[0].priceMinor;
  let maximumMinor = variants[0].priceMinor;
  for (const variant of variants.slice(1)) {
    minimumMinor = Math.min(minimumMinor, variant.priceMinor);
    maximumMinor = Math.max(maximumMinor, variant.priceMinor);
  }

  return { minimumMinor, maximumMinor, currency: "USD" };
}

export function getFeaturedProducts(limit = 8): readonly Product[] {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 0;
  return catalog.products
    .filter((product) => product.featuredRank !== undefined)
    .toSorted((left, right) => {
      const rankDifference = (left.featuredRank ?? Number.MAX_SAFE_INTEGER) - (right.featuredRank ?? Number.MAX_SAFE_INTEGER);
      return rankDifference || left.name.localeCompare(right.name);
    })
    .slice(0, safeLimit);
}

export function getRelatedProducts(productOrId: Product | string, limit = 4): readonly Product[] {
  const product = typeof productOrId === "string" ? getProductById(productOrId) : productOrId;
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 0;
  if (!product || safeLimit === 0) return [];

  const selected: Product[] = [];
  const selectedIds = new Set<string>([product.id]);

  for (const complementId of product.complementIds) {
    const complement = productById.get(complementId);
    if (complement && !selectedIds.has(complement.id)) {
      selected.push(complement);
      selectedIds.add(complement.id);
    }
    if (selected.length === safeLimit) return selected;
  }

  const scored = catalog.products
    .filter((candidate) => !selectedIds.has(candidate.id))
    .map((candidate) => {
      const sharedRooms = candidate.roomIds.filter((id) => product.roomIds.includes(id)).length;
      const sharedCollections = candidate.collectionIds.filter((id) => product.collectionIds.includes(id)).length;
      const sharedStyles = candidate.styleTags.filter((tag) => product.styleTags.includes(tag)).length;
      const score = (candidate.categoryId === product.categoryId ? 5 : 0) + sharedRooms * 3 + sharedCollections * 4 + sharedStyles;
      return { candidate, score };
    })
    .toSorted((left, right) => {
      const scoreDifference = right.score - left.score;
      const rankDifference = (left.candidate.featuredRank ?? Number.MAX_SAFE_INTEGER) - (right.candidate.featuredRank ?? Number.MAX_SAFE_INTEGER);
      return scoreDifference || rankDifference || left.candidate.name.localeCompare(right.candidate.name);
    });

  selected.push(...scored.slice(0, safeLimit - selected.length).map(({ candidate }) => candidate));
  return selected;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productSearchText(product: Product): string {
  const category = categoryById.get(product.categoryId);
  const rooms = product.roomIds.flatMap((id) => roomById.get(id)?.name ?? []);
  const collections = product.collectionIds.flatMap((id) => collectionById.get(id)?.name ?? []);

  return normalizeSearchValue(
    [
      product.name,
      product.shortDescription,
      product.description,
      category?.name ?? "",
      ...rooms,
      ...collections,
      ...product.styleTags,
      ...product.materials,
      ...product.features,
    ].join(" "),
  );
}

const searchableProductText = new Map(catalog.products.map((product) => [product.id, productSearchText(product)]));

export function searchProducts(query: string, products: readonly Product[] = catalog.products): readonly Product[] {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return [...products];

  const terms = normalizedQuery.split(" ");
  return products.filter((product) => {
    const searchText = searchableProductText.get(product.id) ?? productSearchText(product);
    return terms.every((term) => searchText.includes(term));
  });
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  return right.length === 0 || right.some((value) => left.includes(value));
}

export function filterProducts(
  filters: ProductFilters,
  products: readonly Product[] = catalog.products,
): readonly Product[] {
  return products.filter((product) => {
    if (filters.categoryIds && filters.categoryIds.length > 0 && !filters.categoryIds.includes(product.categoryId)) return false;
    if (filters.roomIds && !intersects(product.roomIds, filters.roomIds)) return false;
    if (filters.collectionIds && !intersects(product.collectionIds, filters.collectionIds)) return false;
    if (filters.styleTags && !intersects(product.styleTags, filters.styleTags)) return false;
    if (filters.productTypes && filters.productTypes.length > 0 && !filters.productTypes.includes(product.productType)) return false;

    if (filters.materials && filters.materials.length > 0) {
      const productMaterials = product.materials.map(normalizeSearchValue);
      const matchesMaterial = filters.materials.some((requestedMaterial) => {
        const normalizedMaterial = normalizeSearchValue(requestedMaterial);
        return productMaterials.some((material) => material.includes(normalizedMaterial));
      });
      if (!matchesMaterial) return false;
    }

    const range = getProductPriceRange(product);
    if (!range) return false;
    if (filters.minimumPriceMinor !== undefined && range.maximumMinor < filters.minimumPriceMinor) return false;
    if (filters.maximumPriceMinor !== undefined && range.minimumMinor > filters.maximumPriceMinor) return false;
    return true;
  });
}

export function sortProducts(products: readonly Product[], sort: ProductSort = "featured"): readonly Product[] {
  const sorted = [...products];
  const byName = (left: Product, right: Product) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id);

  switch (sort) {
    case "name":
      return sorted.toSorted(byName);
    case "newest":
      return sorted.toSorted((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt) || byName(left, right));
    case "price-asc":
      return sorted.toSorted((left, right) => {
        const leftPrice = getProductPriceRange(left)?.minimumMinor ?? Number.MAX_SAFE_INTEGER;
        const rightPrice = getProductPriceRange(right)?.minimumMinor ?? Number.MAX_SAFE_INTEGER;
        return leftPrice - rightPrice || byName(left, right);
      });
    case "price-desc":
      return sorted.toSorted((left, right) => {
        const leftPrice = getProductPriceRange(left)?.minimumMinor ?? -1;
        const rightPrice = getProductPriceRange(right)?.minimumMinor ?? -1;
        return rightPrice - leftPrice || byName(left, right);
      });
    case "featured":
      return sorted.toSorted((left, right) => {
        const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
        const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank || byName(left, right);
      });
  }
}

export function selectProducts(selection: ProductSelection = {}): readonly Product[] {
  let products: readonly Product[] = catalog.products;
  if (selection.query) products = searchProducts(selection.query, products);
  if (selection.filters) products = filterProducts(selection.filters, products);
  return sortProducts(products, selection.sort ?? "featured");
}

export function formatPrice(
  priceMinor: number,
  currency: "USD" = catalog.site.currency,
  locale: string = catalog.site.locale,
): string {
  if (!Number.isInteger(priceMinor) || priceMinor < 0) {
    throw new RangeError(`priceMinor must be a nonnegative integer; received ${priceMinor}`);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: priceMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceMinor / 100);
}

export function formatProductPrice(productOrId: Product | string): string | undefined {
  const range = getProductPriceRange(productOrId);
  if (!range) return undefined;
  if (range.minimumMinor === range.maximumMinor) return formatPrice(range.minimumMinor, range.currency);
  return `${formatPrice(range.minimumMinor, range.currency)}–${formatPrice(range.maximumMinor, range.currency)}`;
}

function checkUnique<T>(
  items: readonly T[],
  getValue: (item: T) => string,
  path: string,
  errors: string[],
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    const value = getValue(item);
    if (!value.trim()) {
      errors.push(`${path}[${index}] is empty`);
    } else if (seen.has(value)) {
      errors.push(`${path} contains duplicate value "${value}"`);
    } else {
      seen.add(value);
    }
  });
}

function checkNonnegativeInteger(value: number, path: string, errors: string[]): void {
  if (!Number.isInteger(value) || value < 0) errors.push(`${path} must be a nonnegative integer`);
}

function checkPositiveInteger(value: number, path: string, errors: string[]): void {
  if (!Number.isInteger(value) || value <= 0) errors.push(`${path} must be a positive integer`);
}

function validateLinearDimensions(dimensions: LinearDimensions, path: string, errors: string[]): void {
  checkPositiveInteger(dimensions.widthIn, `${path}.widthIn`, errors);
  checkPositiveInteger(dimensions.heightIn, `${path}.heightIn`, errors);
  checkPositiveInteger(dimensions.depthIn, `${path}.depthIn`, errors);
}

function validateImage(image: CatalogImage, path: string, errors: string[]): void {
  if (!image.id.trim()) errors.push(`${path}.id is required`);
  checkPositiveInteger(image.width, `${path}.width`, errors);
  checkPositiveInteger(image.height, `${path}.height`, errors);
  if (image.alt.trim().length < 20) errors.push(`${path}.alt must be descriptive`);
  if (!image.creatorName.trim()) errors.push(`${path}.creatorName is required`);

  try {
    const url = new URL(image.url);
    if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com") {
      errors.push(`${path}.url must be an https://images.unsplash.com URL`);
    }
    if (!/^\/photo-\d+-[a-zA-Z0-9]+$/.test(url.pathname)) {
      errors.push(`${path}.url must contain a stable Unsplash photo ID`);
    }
    if (Number(url.searchParams.get("w")) !== image.width || Number(url.searchParams.get("h")) !== image.height) {
      errors.push(`${path}.url crop dimensions must match image metadata`);
    }
    if (url.searchParams.get("fit") !== "crop" || url.searchParams.get("auto") !== "format") {
      errors.push(`${path}.url must use deterministic crop and format parameters`);
    }
  } catch {
    errors.push(`${path}.url is not a valid URL`);
  }

  try {
    const sourceUrl = new URL(image.sourcePageUrl);
    if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "unsplash.com" || !sourceUrl.pathname.startsWith("/photos/")) {
      errors.push(`${path}.sourcePageUrl must link to an Unsplash photo page`);
    }
  } catch {
    errors.push(`${path}.sourcePageUrl is not a valid URL`);
  }
}

function validateMediaGroup(
  images: readonly CatalogImage[],
  path: string,
  minimumCount: number,
  errors: string[],
): void {
  if (images.length < minimumCount) errors.push(`${path} must contain at least ${minimumCount} images`);
  checkUnique(images, (image) => image.url, `${path} URLs`, errors);
  images.forEach((image, index) => validateImage(image, `${path}[${index}]`, errors));
  if (!images.some((image) => image.role === "hero")) errors.push(`${path} must include a hero image`);
}

function checkReferences(
  references: readonly string[],
  validIds: ReadonlySet<string>,
  path: string,
  errors: string[],
): void {
  checkUnique(references, (reference) => reference, path, errors);
  for (const reference of references) {
    if (!validIds.has(reference)) errors.push(`${path} references missing id "${reference}"`);
  }
}

export function validateCatalog(value: Catalog = catalog): CatalogValidationResult {
  const errors: string[] = [];

  if (!/^\d+\.\d+\.\d+$/.test(value.schemaVersion)) errors.push("schemaVersion must use semantic version format");
  if (value.products.length !== 24) errors.push(`products must contain exactly 24 entries; found ${value.products.length}`);
  if (value.rooms.length !== 4) errors.push(`rooms must contain exactly 4 entries; found ${value.rooms.length}`);
  if (value.collections.length !== 3) errors.push(`collections must contain exactly 3 entries; found ${value.collections.length}`);
  if (value.looks.length !== 4) errors.push(`looks must contain exactly 4 entries; found ${value.looks.length}`);
  if (value.site.currency !== "USD" || value.site.primaryMarket !== "US") errors.push("site must be US-first and use USD");
  if (!value.site.shipsTo.includes("US") || !value.site.shipsTo.includes("CA")) errors.push("site.shipsTo must include US and CA");
  if (value.site.commerceMode !== "consultation-only") errors.push("site.commerceMode must remain consultation-only");

  checkUnique(value.navigation, (item) => item.id, "navigation ids", errors);
  checkUnique(value.policies, (policy) => policy.id, "policy ids", errors);
  checkUnique(value.policies, (policy) => policy.slug, "policy slugs", errors);
  checkUnique(value.categories, (category) => category.id, "category ids", errors);
  checkUnique(value.categories, (category) => category.slug, "category slugs", errors);
  checkUnique(value.rooms, (room) => room.id, "room ids", errors);
  checkUnique(value.rooms, (room) => room.slug, "room slugs", errors);
  checkUnique(value.collections, (collection) => collection.id, "collection ids", errors);
  checkUnique(value.collections, (collection) => collection.slug, "collection slugs", errors);
  checkUnique(value.looks, (look) => look.id, "look ids", errors);
  checkUnique(value.looks, (look) => look.slug, "look slugs", errors);
  checkUnique(value.products, (product) => product.id, "product ids", errors);
  checkUnique(value.products, (product) => product.slug, "product slugs", errors);
  checkUnique(value.variants, (variant) => variant.id, "variant ids", errors);
  checkUnique(value.variants, (variant) => variant.sku, "variant SKUs", errors);
  checkUnique(value.sampleReviews, (review) => review.id, "sample review ids", errors);

  checkUnique(
    [
      ...value.navigation,
      ...value.policies,
      ...value.categories,
      ...value.rooms,
      ...value.collections,
      ...value.looks,
      ...value.products,
      ...value.variants,
      ...value.sampleReviews,
    ],
    (entity) => entity.id,
    "all entity ids",
    errors,
  );
  checkUnique(
    [...value.policies, ...value.categories, ...value.rooms, ...value.collections, ...value.looks, ...value.products],
    (entity) => entity.slug,
    "all entity slugs",
    errors,
  );

  validateMediaGroup(value.site.heroMedia, "site.heroMedia", 3, errors);
  value.rooms.forEach((room, index) => validateMediaGroup(room.media, `rooms[${index}].media`, 2, errors));
  value.collections.forEach((collection, index) => validateMediaGroup(collection.media, `collections[${index}].media`, 2, errors));
  value.looks.forEach((look, index) => validateMediaGroup(look.media, `looks[${index}].media`, 2, errors));

  const categoryIds = new Set(value.categories.map((category) => category.id));
  const roomIds = new Set(value.rooms.map((room) => room.id));
  const collectionIds = new Set(value.collections.map((collection) => collection.id));
  const productIds = new Set(value.products.map((product) => product.id));
  const variantIds = new Set(value.variants.map((variant) => variant.id));
  const reviewIds = new Set(value.sampleReviews.map((review) => review.id));
  const referencedVariantIds = new Set<string>();
  const referencedReviewIds = new Set<string>();

  value.products.forEach((product, productIndex) => {
    const path = `products[${productIndex}] (${product.id})`;
    if (!categoryIds.has(product.categoryId)) errors.push(`${path}.categoryId references missing id "${product.categoryId}"`);
    if (product.roomIds.length === 0) errors.push(`${path}.roomIds must not be empty`);
    if (product.collectionIds.length === 0) errors.push(`${path}.collectionIds must not be empty`);
    if (product.variantIds.length === 0) errors.push(`${path}.variantIds must not be empty`);
    if (product.complementIds.length < 2) errors.push(`${path}.complementIds must contain at least two products`);
    if (product.styleTags.length === 0) errors.push(`${path}.styleTags must not be empty`);
    if (product.materials.length === 0) errors.push(`${path}.materials must not be empty`);
    if (product.features.length === 0) errors.push(`${path}.features must not be empty`);
    if (product.care.length === 0) errors.push(`${path}.care must not be empty`);
    if (Number.isNaN(Date.parse(product.publishedAt))) errors.push(`${path}.publishedAt must be a valid date`);

    checkReferences(product.roomIds, roomIds, `${path}.roomIds`, errors);
    checkReferences(product.collectionIds, collectionIds, `${path}.collectionIds`, errors);
    checkReferences(product.variantIds, variantIds, `${path}.variantIds`, errors);
    checkReferences(product.complementIds, productIds, `${path}.complementIds`, errors);
    if (product.complementIds.includes(product.id)) errors.push(`${path}.complementIds cannot reference itself`);

    for (const variantId of product.variantIds) {
      if (referencedVariantIds.has(variantId)) errors.push(`variant "${variantId}" is referenced by more than one product`);
      referencedVariantIds.add(variantId);
      const variant = value.variants.find((candidate) => candidate.id === variantId);
      if (variant && variant.productId !== product.id) {
        errors.push(`${path}.variantIds includes "${variantId}" owned by "${variant.productId}"`);
      }
    }

    if (product.sampleReviewIds) {
      checkReferences(product.sampleReviewIds, reviewIds, `${path}.sampleReviewIds`, errors);
      for (const reviewId of product.sampleReviewIds) {
        referencedReviewIds.add(reviewId);
        const review = value.sampleReviews.find((candidate) => candidate.id === reviewId);
        if (review && review.productId !== product.id) {
          errors.push(`${path}.sampleReviewIds includes "${reviewId}" owned by "${review.productId}"`);
        }
      }
    }

    validateMediaGroup(product.images, `${path}.images`, 2, errors);
    validateLinearDimensions(product.dimensions.overall, `${path}.dimensions.overall`, errors);
    checkPositiveInteger(product.dimensions.itemWeightLb, `${path}.dimensions.itemWeightLb`, errors);
    if (product.dimensions.packages.length === 0) errors.push(`${path}.dimensions.packages must not be empty`);
    product.dimensions.packages.forEach((itemPackage, packageIndex) => {
      validateLinearDimensions(itemPackage, `${path}.dimensions.packages[${packageIndex}]`, errors);
      checkPositiveInteger(itemPackage.weightLb, `${path}.dimensions.packages[${packageIndex}].weightLb`, errors);
    });
    if (product.dimensions.seat) validateLinearDimensions(product.dimensions.seat, `${path}.dimensions.seat`, errors);
    if (product.dimensions.cordLengthIn !== undefined) checkPositiveInteger(product.dimensions.cordLengthIn, `${path}.dimensions.cordLengthIn`, errors);
    checkNonnegativeInteger(product.assembly.estimatedMinutes, `${path}.assembly.estimatedMinutes`, errors);

    if (product.productType === "furniture" && !product.willItFit) errors.push(`${path}.willItFit is required for furniture`);
    if (product.willItFit) {
      checkPositiveInteger(product.willItFit.minimumDoorwayWidthIn, `${path}.willItFit.minimumDoorwayWidthIn`, errors);
      checkPositiveInteger(product.willItFit.recommendedPathWidthIn, `${path}.willItFit.recommendedPathWidthIn`, errors);
      if (!product.willItFit.componentBreakdown.trim() || !product.willItFit.notes.trim()) errors.push(`${path}.willItFit requires component and path notes`);
    }
    if (product.dimensions.seat && !product.comfort) errors.push(`${path}.comfort is required when seat dimensions are provided`);
  });

  value.variants.forEach((variant, variantIndex) => {
    const path = `variants[${variantIndex}] (${variant.id})`;
    if (!productIds.has(variant.productId)) errors.push(`${path}.productId references missing id "${variant.productId}"`);
    if (!referencedVariantIds.has(variant.id)) errors.push(`${path} is not referenced by its product`);
    if (!variant.sku.trim()) errors.push(`${path}.sku is required`);
    if (variant.options.length === 0) errors.push(`${path}.options must not be empty`);
    checkNonnegativeInteger(variant.priceMinor, `${path}.priceMinor`, errors);
    if (variant.currency !== "USD") errors.push(`${path}.currency must be USD`);
    if (!variant.leadTimeLabel.trim()) errors.push(`${path}.leadTimeLabel is required`);
    if (variant.overallDimensions) validateLinearDimensions(variant.overallDimensions, `${path}.overallDimensions`, errors);
  });

  value.sampleReviews.forEach((review, reviewIndex) => {
    const path = `sampleReviews[${reviewIndex}] (${review.id})`;
    if (!productIds.has(review.productId)) errors.push(`${path}.productId references missing id "${review.productId}"`);
    if (!referencedReviewIds.has(review.id)) errors.push(`${path} is not referenced by its product`);
    if (review.isSample !== true) errors.push(`${path}.isSample must be true`);
    if (!review.disclosure.toLocaleLowerCase("en-US").includes("fictional sample")) errors.push(`${path}.disclosure must clearly label the review as fictional sample content`);
    if (Number.isNaN(Date.parse(review.publishedAt))) errors.push(`${path}.publishedAt must be a valid date`);
  });

  value.looks.forEach((look, lookIndex) => {
    if (look.productIds.length === 0) errors.push(`looks[${lookIndex}].productIds must not be empty`);
    checkReferences(look.productIds, productIds, `looks[${lookIndex}].productIds`, errors);
  });

  for (const categoryId of categoryIds) {
    if (!value.products.some((product) => product.categoryId === categoryId)) errors.push(`category "${categoryId}" has no products`);
  }
  for (const roomId of roomIds) {
    if (!value.products.some((product) => product.roomIds.includes(roomId))) errors.push(`room "${roomId}" has no products`);
  }
  for (const collectionId of collectionIds) {
    if (!value.products.some((product) => product.collectionIds.includes(collectionId))) errors.push(`collection "${collectionId}" has no products`);
  }

  if (value.inquiry.steps.length !== 2) errors.push("inquiry.steps must contain exactly two steps");
  const firstStepFields = new Set(value.inquiry.steps[0]?.fields);
  const secondStepFields = new Set(value.inquiry.steps[1]?.fields);
  for (const field of ["designService", "scope", "postalCode", "timeline", "investment"] as const) {
    if (!firstStepFields.has(field)) errors.push(`inquiry first step must include "${field}"`);
  }
  for (const field of ["fullName", "email", "phone", "notes"] as const) {
    if (!secondStepFields.has(field)) errors.push(`inquiry second step must include "${field}"`);
  }
  value.inquiry.investmentOptions.forEach((option, index) => {
    checkNonnegativeInteger(option.minimumMinor, `inquiry.investmentOptions[${index}].minimumMinor`, errors);
    if (option.maximumMinor !== null) {
      checkNonnegativeInteger(option.maximumMinor, `inquiry.investmentOptions[${index}].maximumMinor`, errors);
      if (option.maximumMinor <= option.minimumMinor) errors.push(`inquiry.investmentOptions[${index}] maximum must exceed minimum`);
    }
    if (option.currency !== "USD") errors.push(`inquiry.investmentOptions[${index}].currency must be USD`);
  });

  return { valid: errors.length === 0, errors };
}

export function assertValidCatalog(value: Catalog = catalog): asserts value is Catalog {
  const result = validateCatalog(value);
  if (!result.valid) {
    throw new Error(`Catalog integrity validation failed:\n${result.errors.map((error) => `- ${error}`).join("\n")}`);
  }
}

assertValidCatalog(catalog);

export { catalog };
export type { ProductSort };
