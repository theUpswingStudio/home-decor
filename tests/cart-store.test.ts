import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  MAX_CART_LINES,
  MAX_CART_QUANTITY,
} from "@/lib/cart/types";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class FakeWindow extends EventTarget {
  readonly localStorage = new MemoryStorage();
}

function storageEvent(
  key: string | null,
  newValue: string | null,
  storageArea: Storage,
): StorageEvent {
  const event = new Event("storage");
  Object.defineProperties(event, {
    key: { value: key },
    newValue: { value: newValue },
    storageArea: { value: storageArea },
  });
  return event as StorageEvent;
}

async function setupStore() {
  vi.resetModules();
  const fakeWindow = new FakeWindow();
  vi.stubGlobal("window", fakeWindow);
  const { cartStore } = await import("@/lib/cart/store");
  return { cartStore, fakeWindow };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("cartStore", () => {
  it("returns actual add outcomes without importing catalog validation", async () => {
    const { cartStore } = await setupStore();
    const unsubscribe = cartStore.subscribe(() => undefined);

    expect(cartStore.addItem("not-in-the-catalog", 2)).toEqual({
      changed: true,
      quantity: 2,
      itemCount: 2,
    });
    expect(cartStore.setQuantity("not-in-the-catalog", MAX_CART_QUANTITY)).toBe(
      true,
    );
    expect(cartStore.addItem("not-in-the-catalog")).toEqual({
      changed: false,
      reason: "quantity-limit",
      quantity: MAX_CART_QUANTITY,
      itemCount: MAX_CART_QUANTITY,
    });

    for (let index = 1; index < MAX_CART_LINES; index += 1) {
      expect(cartStore.addItem(`variant-${index}`).changed).toBe(true);
    }

    const fullCount = MAX_CART_QUANTITY + MAX_CART_LINES - 1;
    expect(cartStore.addItem("one-too-many")).toEqual({
      changed: false,
      reason: "line-limit",
      quantity: null,
      itemCount: fullCount,
    });

    unsubscribe();
  });

  it("filters storage events and detaches the listener after the last subscriber", async () => {
    const { cartStore, fakeWindow } = await setupStore();
    const removeListener = vi.spyOn(fakeWindow, "removeEventListener");
    const listener = vi.fn();
    const unsubscribe = cartStore.subscribe(listener);

    cartStore.addItem("variant-a", 2);
    fakeWindow.dispatchEvent(
      storageEvent(null, null, new MemoryStorage()),
    );
    expect(cartStore.getSnapshot().items).toEqual([
      { variantId: "variant-a", quantity: 2 },
    ]);

    fakeWindow.localStorage.clear();
    fakeWindow.dispatchEvent(
      storageEvent(null, null, fakeWindow.localStorage),
    );
    expect(cartStore.getSnapshot().items).toEqual([]);

    unsubscribe();
    expect(removeListener).toHaveBeenCalledWith(
      "storage",
      expect.any(Function),
    );

    const remoteValue = JSON.stringify({
      version: CART_STORAGE_VERSION,
      updatedAt: Date.now(),
      items: [{ variantId: "variant-b", quantity: 3 }],
    });
    fakeWindow.localStorage.setItem(CART_STORAGE_KEY, remoteValue);
    fakeWindow.dispatchEvent(
      storageEvent(CART_STORAGE_KEY, remoteValue, fakeWindow.localStorage),
    );
    expect(cartStore.getSnapshot().items).toEqual([]);

    const unsubscribeAgain = cartStore.subscribe(() => undefined);
    expect(cartStore.getSnapshot().items).toEqual([
      { variantId: "variant-b", quantity: 3 },
    ]);
    unsubscribeAgain();
  });

  it("rebases a mutation when another tab wrote before its storage event arrived", async () => {
    const { cartStore, fakeWindow } = await setupStore();
    const unsubscribe = cartStore.subscribe(() => undefined);
    const remoteValue = JSON.stringify({
      version: CART_STORAGE_VERSION,
      updatedAt: Date.now(),
      items: [{ variantId: "remote-variant", quantity: 2 }],
    });
    fakeWindow.localStorage.setItem(CART_STORAGE_KEY, remoteValue);

    expect(cartStore.addItem("local-variant")).toEqual({
      changed: true,
      quantity: 1,
      itemCount: 3,
    });
    expect(cartStore.getSnapshot().items).toEqual([
      { variantId: "remote-variant", quantity: 2 },
      { variantId: "local-variant", quantity: 1 },
    ]);

    const persisted = JSON.parse(
      fakeWindow.localStorage.getItem(CART_STORAGE_KEY) ?? "null",
    ) as { items: unknown };
    expect(persisted.items).toEqual(cartStore.getSnapshot().items);
    unsubscribe();
  });
});
