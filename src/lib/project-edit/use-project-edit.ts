"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CatalogImage, Collection, Product, ProductVariant, Room } from "@/data/catalog";
import {
  getCollectionById,
  getProductById,
  getProductPriceRange,
  getRoomById,
  getVariantById,
} from "@/lib/catalog";
import { projectEntryKey } from "./reducer";
import { projectEditStore } from "./store";
import type { ProjectEditEntry, ProjectProductEntry } from "./types";

export interface ResolvedProjectProduct {
  readonly key: string;
  readonly entry: ProjectProductEntry;
  readonly product: Product;
  readonly variant?: ProductVariant;
  readonly image: CatalogImage;
  readonly lineTotalMinor: number;
}

export interface ResolvedProjectRoom {
  readonly key: string;
  readonly entry: Extract<ProjectEditEntry, { type: "room" }>;
  readonly room: Room;
  readonly image: CatalogImage;
}

export interface ResolvedProjectMaterial {
  readonly key: string;
  readonly entry: Extract<ProjectEditEntry, { type: "material" }>;
  readonly collection: Collection;
  readonly image: CatalogImage;
}

function resolveProduct(entry: ProjectProductEntry): ResolvedProjectProduct | null {
  const product = getProductById(entry.productId);
  const variant = entry.variantId ? getVariantById(entry.variantId) : undefined;
  const image = product?.images.find((candidate) => candidate.role === "hero") ?? product?.images[0];
  if (!product || !image || (entry.variantId && !variant)) return null;
  const guidanceMinor = variant?.priceMinor ?? getProductPriceRange(product)?.minimumMinor ?? 0;
  return {
    key: projectEntryKey(entry),
    entry,
    product,
    ...(variant ? { variant } : {}),
    image,
    lineTotalMinor: guidanceMinor * entry.quantity,
  };
}

export function useProjectEdit() {
  const snapshot = useSyncExternalStore(
    projectEditStore.subscribe,
    projectEditStore.getSnapshot,
    projectEditStore.getServerSnapshot,
  );

  const resolved = useMemo(() => {
    const products: ResolvedProjectProduct[] = [];
    const rooms: ResolvedProjectRoom[] = [];
    const materials: ResolvedProjectMaterial[] = [];

    for (const entry of snapshot.entries) {
      if (entry.type === "product") {
        const item = resolveProduct(entry);
        if (item) products.push(item);
        continue;
      }
      if (entry.type === "room") {
        const room = getRoomById(entry.roomId);
        const image = room?.media.find((candidate) => candidate.role === "hero") ?? room?.media[0];
        if (room && image) rooms.push({ key: projectEntryKey(entry), entry, room, image });
        continue;
      }
      const collection = getCollectionById(entry.collectionId);
      const image = collection?.media.find((candidate) => candidate.role === "detail") ?? collection?.media[0];
      if (collection && image) {
        materials.push({ key: projectEntryKey(entry), entry, collection, image });
      }
    }

    return {
      products,
      rooms,
      materials,
      entryCount: products.length + rooms.length + materials.length,
      guidanceTotalMinor: products.reduce((total, item) => total + item.lineTotalMinor, 0),
    };
  }, [snapshot.entries]);

  return {
    ...snapshot,
    ...resolved,
    saveProduct: projectEditStore.saveProduct,
    saveRoom: projectEditStore.saveRoom,
    saveMaterial: projectEditStore.saveMaterial,
    remove: projectEditStore.remove,
    setQuantity: projectEditStore.setQuantity,
    clear: projectEditStore.clear,
  };
}

export function useProjectEditCount(): number {
  const snapshot = useSyncExternalStore(
    projectEditStore.subscribe,
    projectEditStore.getSnapshot,
    projectEditStore.getServerSnapshot,
  );
  return snapshot.status === "ready" ? snapshot.entries.length : 0;
}
