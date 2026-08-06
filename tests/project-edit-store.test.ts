import { afterEach, describe, expect, it, vi } from "vitest";
import { catalog } from "@/data/catalog";
import { PROJECT_EDIT_STORAGE_KEY } from "@/lib/project-edit/types";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

class FakeWindow extends EventTarget {
  readonly localStorage = new MemoryStorage();
}

function storageEvent(key: string | null, newValue: string | null, storageArea: Storage) {
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
  const { projectEditStore } = await import("@/lib/project-edit/store");
  return { fakeWindow, projectEditStore };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Project Edit store", () => {
  it("validates IDs and persists all three entry types", async () => {
    const { fakeWindow, projectEditStore } = await setupStore();
    const unsubscribe = projectEditStore.subscribe(() => undefined);
    const product = catalog.products[0];
    const variantId = product.variantIds[0];

    expect(projectEditStore.saveProduct("missing")).toMatchObject({
      changed: false,
      reason: "invalid",
    });
    expect(projectEditStore.saveProduct(product.id, variantId, 2).changed).toBe(true);
    expect(projectEditStore.saveRoom(catalog.rooms[0].id).changed).toBe(true);
    expect(projectEditStore.saveMaterial(catalog.collections[0].id).changed).toBe(true);
    expect(projectEditStore.getSnapshot().entries).toHaveLength(3);
    expect(fakeWindow.localStorage.getItem(PROJECT_EDIT_STORAGE_KEY)).not.toBeNull();
    unsubscribe();
  });

  it("saves an AI product configuration with one atomic persistence update", async () => {
    const { fakeWindow, projectEditStore } = await setupStore();
    const listener = vi.fn();
    const unsubscribe = projectEditStore.subscribe(listener);
    const products = catalog.products.slice(0, 3);
    const configuration = products.map((product) => ({
      productId: product.id,
      variantId: product.variantIds[0],
      quantity: 1,
    }));

    const result = projectEditStore.saveProducts(configuration);

    expect(result).toMatchObject({ changed: true, savedCount: 3, entryCount: 3 });
    expect(projectEditStore.getSnapshot().entries).toHaveLength(3);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fakeWindow.localStorage.getItem(PROJECT_EDIT_STORAGE_KEY)).not.toBeNull();
    unsubscribe();
  });

  it("rejects an invalid AI product configuration without a partial save", async () => {
    const { projectEditStore } = await setupStore();
    const unsubscribe = projectEditStore.subscribe(() => undefined);
    const product = catalog.products[0];

    expect(projectEditStore.saveProducts([
      { productId: product.id, variantId: product.variantIds[0] },
      { productId: "missing", variantId: "missing" },
    ])).toMatchObject({ changed: false, reason: "invalid", savedCount: 0 });
    expect(projectEditStore.getSnapshot().entries).toEqual([]);
    unsubscribe();
  });

  it("migrates valid legacy cart lines and removes the old key", async () => {
    const product = catalog.products[0];
    const fakeWindow = new FakeWindow();
    fakeWindow.localStorage.setItem("vestrel-house:cart", JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      items: [{ variantId: product.variantIds[0], quantity: 3 }],
    }));
    vi.resetModules();
    vi.stubGlobal("window", fakeWindow);
    const { projectEditStore } = await import("@/lib/project-edit/store");
    const unsubscribe = projectEditStore.subscribe(() => undefined);

    expect(projectEditStore.getSnapshot().entries).toMatchObject([
      { type: "product", productId: product.id, variantId: product.variantIds[0], quantity: 3 },
    ]);
    expect(fakeWindow.localStorage.getItem("vestrel-house:cart")).toBeNull();
    expect(fakeWindow.localStorage.getItem(PROJECT_EDIT_STORAGE_KEY)).not.toBeNull();
    unsubscribe();
  });

  it("discards an expired legacy cart", async () => {
    const product = catalog.products[0];
    const fakeWindow = new FakeWindow();
    fakeWindow.localStorage.setItem("vestrel-house:cart", JSON.stringify({
      version: 1,
      updatedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      items: [{ variantId: product.variantIds[0], quantity: 3 }],
    }));
    vi.resetModules();
    vi.stubGlobal("window", fakeWindow);
    const { projectEditStore } = await import("@/lib/project-edit/store");
    const unsubscribe = projectEditStore.subscribe(() => undefined);

    expect(projectEditStore.getSnapshot().entries).toEqual([]);
    expect(fakeWindow.localStorage.getItem("vestrel-house:cart")).toBeNull();
    unsubscribe();
  });

  it("syncs a remote clear event and detaches its listener", async () => {
    const { fakeWindow, projectEditStore } = await setupStore();
    const listener = vi.fn();
    const removeListener = vi.spyOn(fakeWindow, "removeEventListener");
    const unsubscribe = projectEditStore.subscribe(listener);
    projectEditStore.saveRoom(catalog.rooms[0].id);

    fakeWindow.localStorage.clear();
    fakeWindow.dispatchEvent(storageEvent(null, null, fakeWindow.localStorage));
    expect(projectEditStore.getSnapshot().entries).toEqual([]);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    expect(removeListener).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});
