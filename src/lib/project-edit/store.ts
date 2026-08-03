import {
  getCollectionById,
  getProductById,
  getRoomById,
  getVariantById,
} from "@/lib/catalog";
import {
  projectEntryKey,
  removeProjectEntry,
  saveProjectEntry,
  setProjectProductQuantity,
} from "./reducer";
import {
  MAX_PROJECT_EDIT_ENTRIES,
  PROJECT_EDIT_STORAGE_KEY,
  PROJECT_EDIT_STORAGE_VERSION,
  PROJECT_EDIT_TTL_MS,
  type ProjectEditEntry,
  type ProjectEditPersistence,
  type ProjectEditSnapshot,
  type ProjectEditStorageEnvelope,
  type SaveProjectEntryResult,
} from "./types";

const LEGACY_CART_STORAGE_KEY = "vestrel-house:cart";
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const EMPTY_ENTRIES: readonly ProjectEditEntry[] = Object.freeze([]);

type ProjectEditListener = () => void;

export const SERVER_PROJECT_EDIT_SNAPSHOT: ProjectEditSnapshot = Object.freeze({
  status: "loading",
  updatedAt: null,
  entries: EMPTY_ENTRIES,
  persistence: "memory",
});

let snapshot: ProjectEditSnapshot = SERVER_PROJECT_EDIT_SNAPSHOT;
let initialized = false;
let listenersAttached = false;
const listeners = new Set<ProjectEditListener>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeAddedAt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeEntry(value: unknown, fallbackAddedAt: number): ProjectEditEntry | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  const addedAt = normalizeAddedAt(value.addedAt, fallbackAddedAt);

  if (type === "product") {
    const productId = normalizeId(value.productId);
    const variantId = normalizeId(value.variantId);
    const roomId = normalizeId(value.roomId);
    if (!productId || !getProductById(productId)) return null;
    if (variantId) {
      const variant = getVariantById(variantId);
      if (!variant || variant.productId !== productId) return null;
    }
    if (roomId && !getRoomById(roomId)) return null;
    const quantity =
      typeof value.quantity === "number" && Number.isFinite(value.quantity)
        ? Math.min(99, Math.max(1, Math.trunc(value.quantity)))
        : 1;
    return {
      type,
      productId,
      ...(variantId ? { variantId } : {}),
      quantity,
      ...(roomId ? { roomId } : {}),
      addedAt,
    };
  }

  if (type === "room") {
    const roomId = normalizeId(value.roomId);
    return roomId && getRoomById(roomId) ? { type, roomId, addedAt } : null;
  }

  if (type === "material") {
    const collectionId = normalizeId(value.collectionId);
    return collectionId && getCollectionById(collectionId)
      ? { type, collectionId, addedAt }
      : null;
  }

  return null;
}

function parseEnvelope(serialized: string, now: number): ProjectEditStorageEnvelope | null {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    value.version !== PROJECT_EDIT_STORAGE_VERSION ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt) ||
    !Array.isArray(value.entries) ||
    now - value.updatedAt > PROJECT_EDIT_TTL_MS ||
    value.updatedAt > now + MAX_FUTURE_CLOCK_SKEW_MS
  ) {
    return null;
  }

  const entries = new Map<string, ProjectEditEntry>();
  for (const candidate of value.entries.slice(0, MAX_PROJECT_EDIT_ENTRIES * 3)) {
    const entry = normalizeEntry(candidate, value.updatedAt);
    if (!entry) continue;
    const key = projectEntryKey(entry);
    if (!entries.has(key) && entries.size < MAX_PROJECT_EDIT_ENTRIES) {
      entries.set(key, entry);
    }
  }

  return {
    version: PROJECT_EDIT_STORAGE_VERSION,
    updatedAt: value.updatedAt,
    entries: [...entries.values()],
  };
}

function migrateLegacyCart(serialized: string, now: number): readonly ProjectEditEntry[] {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return EMPTY_ENTRIES;
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt) ||
    now - value.updatedAt > PROJECT_EDIT_TTL_MS ||
    value.updatedAt > now + MAX_FUTURE_CLOCK_SKEW_MS ||
    !Array.isArray(value.items)
  ) {
    return EMPTY_ENTRIES;
  }

  const entries = new Map<string, ProjectEditEntry>();
  for (const item of value.items.slice(0, MAX_PROJECT_EDIT_ENTRIES * 3)) {
    if (!isRecord(item)) continue;
    const variantId = normalizeId(item.variantId);
    const variant = variantId ? getVariantById(variantId) : undefined;
    if (!variant) continue;
    const quantity =
      typeof item.quantity === "number" && Number.isFinite(item.quantity)
        ? Math.min(99, Math.max(1, Math.trunc(item.quantity)))
        : 1;
    const entry: ProjectEditEntry = {
      type: "product",
      productId: variant.productId,
      variantId: variant.id,
      quantity,
      addedAt: now,
    };
    entries.set(projectEntryKey(entry), entry);
  }
  return [...entries.values()];
}

function readySnapshot(
  entries: readonly ProjectEditEntry[],
  updatedAt: number | null,
  persistence: ProjectEditPersistence,
): ProjectEditSnapshot {
  return { status: "ready", entries, updatedAt, persistence };
}

function readInitialSnapshot(): ProjectEditSnapshot {
  const now = Date.now();
  try {
    const serialized = window.localStorage.getItem(PROJECT_EDIT_STORAGE_KEY);
    if (serialized) {
      const envelope = parseEnvelope(serialized, now);
      if (envelope) return readySnapshot(envelope.entries, envelope.updatedAt, "local");
      window.localStorage.removeItem(PROJECT_EDIT_STORAGE_KEY);
    }

    const legacy = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    if (!legacy) return readySnapshot(EMPTY_ENTRIES, null, "local");
    const entries = migrateLegacyCart(legacy, now);
    if (entries.length === 0) {
      window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
      return readySnapshot(EMPTY_ENTRIES, null, "local");
    }

    const envelope: ProjectEditStorageEnvelope = {
      version: PROJECT_EDIT_STORAGE_VERSION,
      updatedAt: now,
      entries,
    };
    window.localStorage.setItem(PROJECT_EDIT_STORAGE_KEY, JSON.stringify(envelope));
    window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    return readySnapshot(entries, now, "local");
  } catch {
    return readySnapshot(EMPTY_ENTRIES, null, "memory");
  }
}

function haveSameEntries(
  left: readonly ProjectEditEntry[],
  right: readonly ProjectEditEntry[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function replaceSnapshot(
  entries: readonly ProjectEditEntry[],
  updatedAt: number | null,
  persistence: ProjectEditPersistence,
): boolean {
  if (
    snapshot.status === "ready" &&
    snapshot.updatedAt === updatedAt &&
    snapshot.persistence === persistence &&
    haveSameEntries(snapshot.entries, entries)
  ) {
    return false;
  }
  snapshot = readySnapshot(entries, updatedAt, persistence);
  return true;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function refreshFromStorage(): boolean {
  if (snapshot.status !== "ready" || snapshot.persistence !== "local") return false;
  try {
    const serialized = window.localStorage.getItem(PROJECT_EDIT_STORAGE_KEY);
    if (!serialized) return replaceSnapshot(EMPTY_ENTRIES, null, "local");
    const envelope = parseEnvelope(serialized, Date.now());
    if (!envelope) {
      window.localStorage.removeItem(PROJECT_EDIT_STORAGE_KEY);
      return replaceSnapshot(EMPTY_ENTRIES, null, "local");
    }
    if (snapshot.updatedAt !== null && envelope.updatedAt < snapshot.updatedAt) {
      return false;
    }
    return replaceSnapshot(envelope.entries, envelope.updatedAt, "local");
  } catch {
    return replaceSnapshot(snapshot.entries, snapshot.updatedAt, "memory");
  }
}

function persist(entries: readonly ProjectEditEntry[]): void {
  const updatedAt = Math.max(Date.now(), (snapshot.updatedAt ?? 0) + 1);
  let persistence = snapshot.persistence;
  if (persistence === "local") {
    const envelope: ProjectEditStorageEnvelope = {
      version: PROJECT_EDIT_STORAGE_VERSION,
      updatedAt,
      entries,
    };
    try {
      window.localStorage.setItem(PROJECT_EDIT_STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      persistence = "memory";
    }
  }
  snapshot = readySnapshot(entries, updatedAt, persistence);
  notify();
}

function ensureInitialized(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  snapshot = readInitialSnapshot();
}

function save(entry: ProjectEditEntry): SaveProjectEntryResult {
  ensureInitialized();
  if (snapshot.status !== "ready") {
    return { changed: false, reason: "unavailable", entryCount: 0 };
  }
  const refreshed = refreshFromStorage();
  const entries = saveProjectEntry(snapshot.entries, entry);
  if (entries === snapshot.entries) {
    if (refreshed) notify();
    return {
      changed: false,
      reason:
        snapshot.entries.length >= MAX_PROJECT_EDIT_ENTRIES
          ? "entry-limit"
          : "already-saved",
      entryCount: snapshot.entries.length,
    };
  }
  persist(entries);
  return { changed: true, entryCount: entries.length };
}

function handleStorage(event: StorageEvent): void {
  let localStorage: Storage;
  try {
    localStorage = window.localStorage;
  } catch {
    return;
  }
  if (
    event.storageArea !== localStorage ||
    (event.key !== PROJECT_EDIT_STORAGE_KEY && event.key !== null)
  ) return;
  const serialized = event.key === null
    ? localStorage.getItem(PROJECT_EDIT_STORAGE_KEY)
    : event.newValue;
  if (!serialized) {
    if (replaceSnapshot(EMPTY_ENTRIES, null, "local")) notify();
    return;
  }
  const envelope = parseEnvelope(serialized, Date.now());
  if (envelope && replaceSnapshot(envelope.entries, envelope.updatedAt, "local")) {
    notify();
  }
}

function attachListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("storage", handleStorage);
}

function detachListeners(): void {
  if (!listenersAttached || typeof window === "undefined") return;
  listenersAttached = false;
  window.removeEventListener("storage", handleStorage);
}

export const projectEditStore = {
  subscribe(listener: ProjectEditListener): () => void {
    const first = listeners.size === 0;
    listeners.add(listener);
    ensureInitialized();
    if (first) {
      attachListeners();
      refreshFromStorage();
    }
    return () => {
      if (!listeners.delete(listener)) return;
      if (listeners.size === 0) detachListeners();
    };
  },

  getSnapshot(): ProjectEditSnapshot {
    return snapshot;
  },

  getServerSnapshot(): ProjectEditSnapshot {
    return SERVER_PROJECT_EDIT_SNAPSHOT;
  },

  saveProduct(productId: string, variantId?: string, quantity = 1): SaveProjectEntryResult {
    const product = getProductById(productId);
    const variant = variantId ? getVariantById(variantId) : undefined;
    if (!product || (variantId && (!variant || variant.productId !== productId))) {
      return {
        changed: false,
        reason: "invalid",
        entryCount: snapshot.status === "ready" ? snapshot.entries.length : 0,
      };
    }
    return save({
      type: "product",
      productId,
      ...(variantId ? { variantId } : {}),
      quantity: Math.min(99, Math.max(1, Math.trunc(quantity))),
      addedAt: Date.now(),
    });
  },

  saveRoom(roomId: string): SaveProjectEntryResult {
    if (!getRoomById(roomId)) {
      return {
        changed: false,
        reason: "invalid",
        entryCount: snapshot.status === "ready" ? snapshot.entries.length : 0,
      };
    }
    return save({ type: "room", roomId, addedAt: Date.now() });
  },

  saveMaterial(collectionId: string): SaveProjectEntryResult {
    if (!getCollectionById(collectionId)) {
      return {
        changed: false,
        reason: "invalid",
        entryCount: snapshot.status === "ready" ? snapshot.entries.length : 0,
      };
    }
    return save({ type: "material", collectionId, addedAt: Date.now() });
  },

  remove(key: string): boolean {
    ensureInitialized();
    if (snapshot.status !== "ready") return false;
    const refreshed = refreshFromStorage();
    const entries = removeProjectEntry(snapshot.entries, key);
    if (entries === snapshot.entries) {
      if (refreshed) notify();
      return false;
    }
    persist(entries);
    return true;
  },

  setQuantity(key: string, quantity: number): boolean {
    ensureInitialized();
    if (snapshot.status !== "ready") return false;
    const refreshed = refreshFromStorage();
    const entries = setProjectProductQuantity(snapshot.entries, key, quantity);
    if (entries === snapshot.entries) {
      if (refreshed) notify();
      return false;
    }
    persist(entries);
    return true;
  },

  clear(): boolean {
    ensureInitialized();
    if (snapshot.status !== "ready") return false;
    const refreshed = refreshFromStorage();
    if (snapshot.entries.length === 0) {
      if (refreshed) notify();
      return false;
    }
    persist(EMPTY_ENTRIES);
    return true;
  },
};
