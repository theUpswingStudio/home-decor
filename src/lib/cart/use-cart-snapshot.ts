"use client";

import { useSyncExternalStore } from "react";
import { cartStore } from "./store";
import type { CartSnapshot } from "./types";

export function useCartSnapshot(): CartSnapshot {
  return useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
}

export function useCartCount(): number {
  const snapshot = useCartSnapshot();
  if (snapshot.status !== "ready") return 0;
  return snapshot.items.reduce((total, item) => total + item.quantity, 0);
}
