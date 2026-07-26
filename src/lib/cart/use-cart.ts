"use client";

import { useEffect, useMemo } from "react";
import {
  getCartItemCount,
  getCartSubtotalMinor,
  resolveCartLines,
} from "./selectors";
import { cartStore } from "./store";
import { useCartSnapshot } from "./use-cart-snapshot";

export function useCart() {
  const snapshot = useCartSnapshot();
  const resolved = useMemo(() => {
    const lines = resolveCartLines(snapshot.items);
    const resolvedVariantIds = new Set(lines.map((line) => line.variantId));
    const items = lines.map(({ variantId, quantity }) => ({
      variantId,
      quantity,
    }));

    return {
      lines,
      items,
      itemCount: getCartItemCount(items),
      subtotalMinor: getCartSubtotalMinor(lines),
      missingVariantIds: snapshot.items
        .filter((item) => !resolvedVariantIds.has(item.variantId))
        .map((item) => item.variantId),
    };
  }, [snapshot.items]);

  useEffect(() => {
    if (resolved.missingVariantIds.length > 0) {
      cartStore.removeItems(resolved.missingVariantIds);
    }
  }, [resolved.missingVariantIds]);

  return {
    ...snapshot,
    items: resolved.items,
    lines: resolved.lines,
    itemCount: resolved.itemCount,
    subtotalMinor: resolved.subtotalMinor,
    addItem: cartStore.addItem,
    setQuantity: cartStore.setQuantity,
    removeItem: cartStore.removeItem,
    clear: cartStore.clear,
  };
}
