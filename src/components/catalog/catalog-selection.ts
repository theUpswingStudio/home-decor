import type { Product, ProductSort, ProductType } from "@/data/catalog";
import { catalog, selectProducts } from "@/lib/catalog";

export type CatalogSearchParams = Record<string, string | string[] | undefined>;
export type CatalogFilterKey = "category" | "room" | "material" | "style" | "type" | "price";

export interface CatalogFilterOption {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export interface CatalogFilterGroup {
  readonly key: CatalogFilterKey;
  readonly label: string;
  readonly multiple: boolean;
  readonly options: readonly CatalogFilterOption[];
}

export interface ActiveCatalogValues {
  readonly category: readonly string[];
  readonly room: readonly string[];
  readonly material: readonly string[];
  readonly style: readonly string[];
  readonly type: readonly string[];
  readonly price: readonly string[];
  readonly query: readonly string[];
}

interface PriceBand {
  readonly value: string;
  readonly label: string;
  readonly minimumPriceMinor?: number;
  readonly maximumPriceMinor?: number;
}

const materialDefinitions = [
  { value: "wood", label: "Wood", terms: ["wood", "walnut", "oak", "ash"] },
  { value: "upholstery", label: "Upholstery", terms: ["upholstery", "weave", "velvet", "boucle", "linen"] },
  { value: "metal", label: "Metal", terms: ["steel", "aluminum", "bronze"] },
  { value: "stone", label: "Stone & mineral", terms: ["stone", "mineral"] },
  { value: "glass", label: "Glass", terms: ["glass"] },
  { value: "wool", label: "Wool", terms: ["wool"] },
] as const;

const styleValues = [
  "soft geometry",
  "low profile",
  "tailored",
  "compact",
  "architectural",
  "multipurpose",
  "linear",
  "sculptural",
] as const;

const priceBands: readonly PriceBand[] = [
  { value: "under-1500", label: "Under $1,500", maximumPriceMinor: 150000 },
  { value: "1500-3000", label: "$1,500–$3,000", minimumPriceMinor: 150000, maximumPriceMinor: 300000 },
  { value: "3000-5000", label: "$3,000–$5,000", minimumPriceMinor: 300000, maximumPriceMinor: 500000 },
  { value: "5000-plus", label: "$5,000 and above", minimumPriceMinor: 500000 },
];

const productTypeLabels: Record<ProductType, string> = {
  furniture: "Furniture",
  lighting: "Lighting",
  textile: "Textiles",
};

const validSorts = new Set<ProductSort>(["featured", "newest", "name", "price-asc", "price-desc"]);

function rawValues(params: CatalogSearchParams, key: string): string[] {
  const raw = params[key];
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return [...new Set(values.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))];
}

function rawSingleValue(params: CatalogSearchParams, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

function validValues(params: CatalogSearchParams, key: string, allowed: ReadonlySet<string>): string[] {
  return rawValues(params, key).filter((value) => allowed.has(value));
}

function productMatchesMaterial(product: Product, material: string): boolean {
  const definition = materialDefinitions.find((candidate) => candidate.value === material);
  if (!definition) return false;
  const text = product.materials.join(" ").toLocaleLowerCase("en-US");
  return definition.terms.some((term) => text.includes(term));
}

function countMatching(predicate: (product: Product) => boolean): number {
  return catalog.products.filter(predicate).length;
}

export const catalogFilterGroups: readonly CatalogFilterGroup[] = [
  {
    key: "category",
    label: "Category",
    multiple: true,
    options: catalog.categories.map((category) => ({
      value: category.slug,
      label: category.name,
      count: countMatching((product) => product.categoryId === category.id),
    })),
  },
  {
    key: "room",
    label: "Room",
    multiple: true,
    options: catalog.rooms.map((room) => ({
      value: room.slug,
      label: room.name,
      count: countMatching((product) => product.roomIds.includes(room.id)),
    })),
  },
  {
    key: "material",
    label: "Material",
    multiple: true,
    options: materialDefinitions.map((material) => ({
      value: material.value,
      label: material.label,
      count: countMatching((product) => productMatchesMaterial(product, material.value)),
    })),
  },
  {
    key: "style",
    label: "Style",
    multiple: true,
    options: styleValues.map((style) => ({
      value: style,
      label: style.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()),
      count: countMatching((product) => product.styleTags.includes(style)),
    })),
  },
  {
    key: "type",
    label: "Product type",
    multiple: true,
    options: (Object.keys(productTypeLabels) as ProductType[]).map((type) => ({
      value: type,
      label: productTypeLabels[type],
      count: countMatching((product) => product.productType === type),
    })),
  },
  {
    key: "price",
    label: "Price",
    multiple: false,
    options: priceBands.map((band) => ({
      value: band.value,
      label: band.label,
      count: selectProducts({ filters: { minimumPriceMinor: band.minimumPriceMinor, maximumPriceMinor: band.maximumPriceMinor } }).length,
    })),
  },
];

const optionSets = new Map(catalogFilterGroups.map((group) => [group.key, new Set(group.options.map((option) => option.value))]));

export function getCatalogSelection(params: CatalogSearchParams): {
  readonly active: ActiveCatalogValues;
  readonly products: readonly Product[];
  readonly sort: ProductSort;
} {
  const category = validValues(params, "category", optionSets.get("category") ?? new Set());
  const room = validValues(params, "room", optionSets.get("room") ?? new Set());
  const material = validValues(params, "material", optionSets.get("material") ?? new Set());
  const style = validValues(params, "style", optionSets.get("style") ?? new Set());
  const type = validValues(params, "type", optionSets.get("type") ?? new Set());
  const price = validValues(params, "price", optionSets.get("price") ?? new Set()).slice(0, 1);
  const rawQuery = rawSingleValue(params, "query");
  const query = rawQuery ? [rawQuery] : [];
  const requestedSort = rawSingleValue(params, "sort") as ProductSort | undefined;
  const sort = requestedSort && validSorts.has(requestedSort) ? requestedSort : "featured";
  const categoryIds = category.flatMap((slug) => catalog.categories.find((item) => item.slug === slug)?.id ?? []);
  const roomIds = room.flatMap((slug) => catalog.rooms.find((item) => item.slug === slug)?.id ?? []);
  const band = priceBands.find((candidate) => candidate.value === price[0]);

  let products = selectProducts({
    query: query[0],
    sort,
    filters: {
      categoryIds,
      roomIds,
      styleTags: style,
      productTypes: type as ProductType[],
      minimumPriceMinor: band?.minimumPriceMinor,
      maximumPriceMinor: band?.maximumPriceMinor,
    },
  });

  if (material.length > 0) {
    products = products.filter((product) => material.some((value) => productMatchesMaterial(product, value)));
  }

  return {
    active: { category, room, material, style, type, price, query },
    products,
    sort,
  };
}
