import type { Collection, Product, Room } from "@/data/catalog";
import { catalog, getProductsByCollection, getProductsByRoom } from "@/lib/catalog";
import {
  getCatalogSelection,
  getProductFilterValues,
  type ActiveCatalogValues,
  type CatalogSearchParams,
} from "./catalog-selection";

export type ShopEntryType = "all" | "product" | "room-edit" | "material-note";

export type ShopIndexEntry =
  | { readonly type: "product"; readonly product: Product }
  | { readonly type: "room-edit"; readonly room: Room }
  | { readonly type: "material-note"; readonly collection: Collection };

export interface ShopFilterRecord {
  readonly id: string;
  readonly entryType: Exclude<ShopEntryType, "all">;
  readonly searchText: string;
  readonly values: Omit<ActiveCatalogValues, "query">;
}

const ENTRY_TYPES = new Set<ShopEntryType>([
  "all",
  "product",
  "room-edit",
  "material-note",
]);

function rawSingle(params: CatalogSearchParams, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mergeProductValues(products: readonly Product[]): Omit<ActiveCatalogValues, "query"> {
  const merged = {
    category: new Set<string>(),
    room: new Set<string>(),
    material: new Set<string>(),
    style: new Set<string>(),
    type: new Set<string>(),
    price: new Set<string>(),
  };
  for (const product of products) {
    const values = getProductFilterValues(product);
    for (const key of Object.keys(merged) as (keyof typeof merged)[]) {
      values[key].forEach((value) => merged[key].add(value));
    }
  }
  return {
    category: [...merged.category],
    room: [...merged.room],
    material: [...merged.material],
    style: [...merged.style],
    type: [...merged.type],
    price: [...merged.price],
  };
}

export const shopFilterRecords: readonly ShopFilterRecord[] = [
  ...catalog.products.map((product) => ({
    id: product.id,
    entryType: "product" as const,
    searchText: normalize([
      product.name,
      product.shortDescription,
      product.description,
      ...product.materials,
      ...product.styleTags,
    ].join(" ")),
    values: getProductFilterValues(product),
  })),
  ...catalog.rooms.map((room) => {
    const products = getProductsByRoom(room);
    return {
      id: room.id,
      entryType: "room-edit" as const,
      searchText: normalize([room.name, room.shortDescription, room.description].join(" ")),
      values: mergeProductValues(products),
    };
  }),
  ...catalog.collections.map((collection) => {
    const products = getProductsByCollection(collection);
    return {
      id: collection.id,
      entryType: "material-note" as const,
      searchText: normalize([
        collection.name,
        collection.shortDescription,
        collection.description,
        ...collection.palette,
      ].join(" ")),
      values: mergeProductValues(products),
    };
  }),
];

export function recordMatchesSelection(
  record: ShopFilterRecord,
  entryType: ShopEntryType,
  active: ActiveCatalogValues,
): boolean {
  if (entryType !== "all" && record.entryType !== entryType) return false;
  const productOnlyActive = active.category.length > 0 || active.type.length > 0 || active.price.length > 0;
  if (productOnlyActive && record.entryType !== "product") return false;

  const keys: readonly (keyof Omit<ActiveCatalogValues, "query">)[] = [
    "category",
    "room",
    "material",
    "style",
    "type",
    "price",
  ];
  for (const key of keys) {
    if (
      active[key].length > 0 &&
      !active[key].some((value) => record.values[key].includes(value))
    ) {
      return false;
    }
  }

  const query = normalize(active.query[0] ?? "");
  return !query || query.split(" ").every((term) => record.searchText.includes(term));
}

export function countMatchingShopRecords(
  records: readonly ShopFilterRecord[],
  entryType: ShopEntryType,
  active: ActiveCatalogValues,
): number {
  return records.filter((record) => recordMatchesSelection(record, entryType, active)).length;
}

export function getShopSelection(params: CatalogSearchParams): {
  readonly active: ActiveCatalogValues;
  readonly entryType: ShopEntryType;
  readonly entries: readonly ShopIndexEntry[];
  readonly resultCount: number;
  readonly sort: ReturnType<typeof getCatalogSelection>["sort"];
  readonly curated: boolean;
  readonly typeCounts: Readonly<Record<ShopEntryType, number>>;
} {
  const catalogSelection = getCatalogSelection(params);
  const requestedType = rawSingle(params, "entry") as ShopEntryType | undefined;
  const entryType = requestedType && ENTRY_TYPES.has(requestedType) ? requestedType : "all";
  const hasSelection = Object.values(catalogSelection.active).some((values) => values.length > 0);
  const curated = !hasSelection && entryType === "all" && rawSingle(params, "sort") === undefined;
  const matchingRecords = shopFilterRecords.filter((record) =>
    recordMatchesSelection(record, entryType, catalogSelection.active),
  );
  const productIds = new Set(catalogSelection.products.map((product) => product.id));

  const entries = matchingRecords.flatMap<ShopIndexEntry>((record) => {
    if (record.entryType === "product") {
      const product = catalog.products.find((item) => item.id === record.id);
      return product && productIds.has(product.id) ? [{ type: "product", product }] : [];
    }
    if (record.entryType === "room-edit") {
      const room = catalog.rooms.find((item) => item.id === record.id);
      return room ? [{ type: "room-edit", room }] : [];
    }
    const collection = catalog.collections.find((item) => item.id === record.id);
    return collection ? [{ type: "material-note", collection }] : [];
  });

  const typeCounts = {
    all: countMatchingShopRecords(shopFilterRecords, "all", catalogSelection.active),
    product: countMatchingShopRecords(shopFilterRecords, "product", catalogSelection.active),
    "room-edit": countMatchingShopRecords(shopFilterRecords, "room-edit", catalogSelection.active),
    "material-note": countMatchingShopRecords(shopFilterRecords, "material-note", catalogSelection.active),
  };

  return {
    active: catalogSelection.active,
    entryType,
    entries,
    resultCount: entries.length,
    sort: catalogSelection.sort,
    curated,
    typeCounts,
  };
}
