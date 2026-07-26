import { cartReducer, clampCartQuantity } from "./reducer";
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  CART_TTL_MS,
  MAX_CART_LINES,
  type AddCartItemResult,
  type CartAction,
  type CartItem,
  type CartPersistence,
  type CartSnapshot,
  type CartStorageEnvelope,
} from "./types";

type CartListener = () => void;

interface DispatchResult {
  readonly ready: boolean;
  readonly changed: boolean;
  readonly items: readonly CartItem[];
}

const MAX_STORAGE_ITEMS_TO_INSPECT = MAX_CART_LINES * 5;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const EMPTY_ITEMS: readonly CartItem[] = Object.freeze([]);

export const SERVER_CART_SNAPSHOT: CartSnapshot = Object.freeze({
  status: "loading",
  updatedAt: null,
  items: EMPTY_ITEMS,
  persistence: "memory",
});

let snapshot: CartSnapshot = SERVER_CART_SNAPSHOT;
let initialized = false;
let listenersAttached = false;
const listeners = new Set<CartListener>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeVariantId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const variantId = value.trim();
  return variantId || null;
}

function normalizeQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return clampCartQuantity(value);
}

function parseEnvelope(
  serialized: string,
  now: number,
): Pick<CartStorageEnvelope, "updatedAt" | "items"> | null {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    value.version !== CART_STORAGE_VERSION ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt) ||
    !Array.isArray(value.items)
  ) {
    return null;
  }

  if (
    now - value.updatedAt > CART_TTL_MS ||
    value.updatedAt > now + MAX_FUTURE_CLOCK_SKEW_MS
  ) {
    return null;
  }

  const quantities = new Map<string, number>();
  const inspectedItems = value.items.slice(0, MAX_STORAGE_ITEMS_TO_INSPECT);

  for (const candidate of inspectedItems) {
    if (!isRecord(candidate)) continue;

    const variantId = normalizeVariantId(candidate.variantId);
    const quantity = normalizeQuantity(candidate.quantity);
    if (!variantId || quantity === null) continue;

    const previousQuantity = quantities.get(variantId);
    if (previousQuantity !== undefined) {
      quantities.set(
        variantId,
        clampCartQuantity(previousQuantity + quantity),
      );
      continue;
    }

    if (quantities.size < MAX_CART_LINES) quantities.set(variantId, quantity);
  }

  return {
    updatedAt: value.updatedAt,
    items: Array.from(quantities, ([variantId, quantity]) => ({
      variantId,
      quantity,
    })),
  };
}

function createReadySnapshot(
  items: readonly CartItem[],
  updatedAt: number | null,
  persistence: CartPersistence,
): CartSnapshot {
  return { status: "ready", items, updatedAt, persistence };
}

function readInitialSnapshot(): CartSnapshot {
  try {
    const serialized = window.localStorage.getItem(CART_STORAGE_KEY);
    if (serialized === null) {
      return createReadySnapshot(EMPTY_ITEMS, null, "local");
    }

    const envelope = parseEnvelope(serialized, Date.now());
    if (envelope) {
      return createReadySnapshot(envelope.items, envelope.updatedAt, "local");
    }

    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return createReadySnapshot(EMPTY_ITEMS, null, "local");
    } catch {
      return createReadySnapshot(EMPTY_ITEMS, null, "memory");
    }
  } catch {
    return createReadySnapshot(EMPTY_ITEMS, null, "memory");
  }
}

function haveSameItems(
  left: readonly CartItem[],
  right: readonly CartItem[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (item, index) =>
        item.variantId === right[index]?.variantId &&
        item.quantity === right[index]?.quantity,
    )
  );
}

function replaceSnapshot(
  items: readonly CartItem[],
  updatedAt: number | null,
  persistence: CartPersistence,
): boolean {
  if (
    snapshot.status === "ready" &&
    snapshot.updatedAt === updatedAt &&
    snapshot.persistence === persistence &&
    haveSameItems(snapshot.items, items)
  ) {
    return false;
  }

  snapshot = createReadySnapshot(items, updatedAt, persistence);
  return true;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function refreshFromStorage(): boolean {
  if (snapshot.status !== "ready" || snapshot.persistence !== "local") {
    return false;
  }

  try {
    const serialized = window.localStorage.getItem(CART_STORAGE_KEY);
    if (serialized === null) {
      return replaceSnapshot(EMPTY_ITEMS, null, "local");
    }

    const envelope = parseEnvelope(serialized, Date.now());
    if (!envelope) {
      try {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return replaceSnapshot(EMPTY_ITEMS, null, "local");
      } catch {
        return replaceSnapshot(snapshot.items, snapshot.updatedAt, "memory");
      }
    }

    if (
      snapshot.updatedAt !== null &&
      envelope.updatedAt < snapshot.updatedAt
    ) {
      return false;
    }

    return replaceSnapshot(envelope.items, envelope.updatedAt, "local");
  } catch {
    return replaceSnapshot(snapshot.items, snapshot.updatedAt, "memory");
  }
}

function persist(items: readonly CartItem[]): void {
  const updatedAt = Math.max(Date.now(), (snapshot.updatedAt ?? 0) + 1);
  let persistence = snapshot.persistence;

  if (persistence === "local") {
    const envelope: CartStorageEnvelope = {
      version: CART_STORAGE_VERSION,
      updatedAt,
      items,
    };

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      persistence = "memory";
    }
  }

  snapshot = createReadySnapshot(items, updatedAt, persistence);
  notify();
}

function ensureInitialized(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  snapshot = readInitialSnapshot();
}

function dispatch(action: CartAction): DispatchResult {
  ensureInitialized();
  if (snapshot.status !== "ready") {
    return { ready: false, changed: false, items: EMPTY_ITEMS };
  }

  // Rebase on the latest persisted state if a cross-tab storage event is late.
  const refreshed = refreshFromStorage();
  const items = cartReducer(snapshot.items, action);
  if (items === snapshot.items) {
    if (refreshed) notify();
    return { ready: true, changed: false, items: snapshot.items };
  }

  persist(items);
  return { ready: true, changed: true, items };
}

function getItemCount(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function handleStorage(event: StorageEvent): void {
  const localStorage = getLocalStorage();
  if (!localStorage || event.storageArea !== localStorage) return;
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;

  if (event.key === null || event.newValue === null) {
    if (replaceSnapshot(EMPTY_ITEMS, null, "local")) notify();
    return;
  }

  const envelope = parseEnvelope(event.newValue, Date.now());
  if (!envelope) {
    if (replaceSnapshot(EMPTY_ITEMS, null, "local")) notify();
    return;
  }

  if (
    snapshot.updatedAt !== null &&
    envelope.updatedAt < snapshot.updatedAt
  ) {
    return;
  }

  if (replaceSnapshot(envelope.items, envelope.updatedAt, "local")) notify();
}

function attachListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("storage", handleStorage);
}

function detachListeners(): void {
  if (!listenersAttached || typeof window === "undefined") return;
  window.removeEventListener("storage", handleStorage);
  listenersAttached = false;
}

export const cartStore = {
  subscribe(listener: CartListener): () => void {
    const isFirstListener = listeners.size === 0;
    listeners.add(listener);
    ensureInitialized();

    if (isFirstListener) {
      attachListeners();
      refreshFromStorage();
    }

    return () => {
      if (!listeners.delete(listener)) return;
      if (listeners.size === 0) detachListeners();
    };
  },

  getSnapshot(): CartSnapshot {
    return snapshot;
  },

  getServerSnapshot(): CartSnapshot {
    return SERVER_CART_SNAPSHOT;
  },

  addItem(variantId: string, quantity = 1): AddCartItemResult {
    const normalizedVariantId = normalizeVariantId(variantId);
    const normalizedQuantity = normalizeQuantity(quantity);
    if (!normalizedVariantId || normalizedQuantity === null) {
      return {
        changed: false,
        reason: "invalid",
        quantity: null,
        itemCount:
          snapshot.status === "ready" ? getItemCount(snapshot.items) : 0,
      };
    }

    const result = dispatch({
      type: "add",
      variantId: normalizedVariantId,
      quantity: normalizedQuantity,
    });
    const itemCount = getItemCount(result.items);
    const line = result.items.find(
      (item) => item.variantId === normalizedVariantId,
    );

    if (!result.ready) {
      return {
        changed: false,
        reason: "unavailable",
        quantity: null,
        itemCount,
      };
    }

    if (!result.changed) {
      return {
        changed: false,
        reason: line ? "quantity-limit" : "line-limit",
        quantity: line?.quantity ?? null,
        itemCount,
      };
    }

    return {
      changed: true,
      quantity: line?.quantity ?? normalizedQuantity,
      itemCount,
    };
  },

  setQuantity(variantId: string, quantity: number): boolean {
    const normalizedVariantId = normalizeVariantId(variantId);
    const normalizedQuantity = normalizeQuantity(quantity);
    if (!normalizedVariantId || normalizedQuantity === null) return false;

    return dispatch({
      type: "set-quantity",
      variantId: normalizedVariantId,
      quantity: normalizedQuantity,
    }).changed;
  },

  removeItem(variantId: string): boolean {
    const normalizedVariantId = normalizeVariantId(variantId);
    if (!normalizedVariantId) return false;
    return dispatch({ type: "remove", variantId: normalizedVariantId }).changed;
  },

  removeItems(variantIds: readonly string[]): boolean {
    const normalizedVariantIds = Array.from(
      new Set(variantIds.map(normalizeVariantId).filter((id) => id !== null)),
    );
    if (normalizedVariantIds.length === 0) return false;
    return dispatch({
      type: "remove-many",
      variantIds: normalizedVariantIds,
    }).changed;
  },

  clear(): boolean {
    return dispatch({ type: "clear" }).changed;
  },
};
