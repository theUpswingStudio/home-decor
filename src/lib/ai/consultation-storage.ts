import type {
  ConsultationIntake,
  ConsultationPreview,
  ConsultationResult,
  PreparedRoomAsset,
} from "./consultation-types";

export const CONSULTATION_STORAGE_VERSION = 3 as const;
export const CONSULTATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const CONSULTATION_POINTER_KEY = "vestrel-house:ai-consultation:latest:v3";

const DATABASE_NAME = "vestrel-house-ai-consultation";
const DATABASE_VERSION = 1;
const STORE_NAME = "consultations";

export interface SavedConsultationRecord {
  readonly version: typeof CONSULTATION_STORAGE_VERSION;
  readonly id: string;
  readonly step: number;
  readonly intake: ConsultationIntake;
  readonly room: PreparedRoomAsset;
  readonly result: ConsultationResult | null;
  readonly selectedProductIds: readonly string[];
  readonly preview: ConsultationPreview;
  readonly updatedAt: number;
  readonly expiresAt: number;
}

interface ConsultationStorageEnvironment {
  readonly indexedDB?: IDBFactory;
  readonly localStorage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  readonly now?: () => number;
}

export interface ConsultationStorage {
  loadLatest(): Promise<SavedConsultationRecord | null>;
  save(record: Omit<SavedConsultationRecord, "updatedAt" | "expiresAt">): Promise<void>;
  clear(): Promise<void>;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage request failed."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Browser storage transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Browser storage transaction was stopped."));
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Browser storage could not open."));
    request.onblocked = () => reject(new Error("Browser storage is blocked by another tab."));
  });
}

function deleteExpired(store: IDBObjectStore, now: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      const value = cursor.value as Partial<SavedConsultationRecord>;
      if (typeof value.expiresAt !== "number" || value.expiresAt <= now) cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error("Expired consultations could not be removed."));
  });
}

function isSavedRecord(value: unknown, expectedId: string): value is SavedConsultationRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<SavedConsultationRecord>;
  return record.version === CONSULTATION_STORAGE_VERSION
    && record.id === expectedId
    && typeof record.step === "number"
    && typeof record.intake === "object"
    && record.intake !== null
    && typeof record.room === "object"
    && record.room !== null
    && record.room.blob instanceof Blob
    && typeof record.result !== "undefined"
    && Array.isArray(record.selectedProductIds)
    && typeof record.preview === "object"
    && record.preview !== null
    && typeof record.expiresAt === "number";
}

function getBrowserEnvironment(overrides: ConsultationStorageEnvironment): Required<ConsultationStorageEnvironment> {
  const factory = overrides.indexedDB ?? globalThis.indexedDB;
  const pointerStorage = overrides.localStorage ?? globalThis.localStorage;
  if (!factory || !pointerStorage) throw new Error("Persistent browser storage is unavailable.");
  return {
    indexedDB: factory,
    localStorage: pointerStorage,
    now: overrides.now ?? Date.now,
  };
}

export function createConsultationStorage(
  overrides: ConsultationStorageEnvironment = {},
): ConsultationStorage {
  let writes: Promise<void> = Promise.resolve();
  function enqueueWrite(operation: () => Promise<void>): Promise<void> {
    const next = writes.then(operation);
    writes = next.catch(() => undefined);
    return next;
  }

  return {
    async loadLatest() {
      await writes;
      const environment = getBrowserEnvironment(overrides);
      const latestId = environment.localStorage.getItem(CONSULTATION_POINTER_KEY);
      const database = await openDatabase(environment.indexedDB);
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        await deleteExpired(store, environment.now());
        const value = latestId ? await requestValue(store.get(latestId)) : null;
        await transactionComplete(transaction);

        if (!latestId || !isSavedRecord(value, latestId) || value.expiresAt <= environment.now()) {
          environment.localStorage.removeItem(CONSULTATION_POINTER_KEY);
          return null;
        }
        return value;
      } finally {
        database.close();
      }
    },

    save(record) {
      return enqueueWrite(async () => {
        const environment = getBrowserEnvironment(overrides);
        const now = environment.now();
        const savedRecord: SavedConsultationRecord = {
          ...record,
          updatedAt: now,
          expiresAt: now + CONSULTATION_RETENTION_MS,
        };
        const database = await openDatabase(environment.indexedDB);
        try {
          const transaction = database.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          await deleteExpired(store, now);
          store.put(savedRecord);
          await transactionComplete(transaction);
          environment.localStorage.setItem(CONSULTATION_POINTER_KEY, record.id);
        } finally {
          database.close();
        }
      });
    },

    clear() {
      return enqueueWrite(async () => {
        const environment = getBrowserEnvironment(overrides);
        const database = await openDatabase(environment.indexedDB);
        try {
          const transaction = database.transaction(STORE_NAME, "readwrite");
          transaction.objectStore(STORE_NAME).clear();
          await transactionComplete(transaction);
          environment.localStorage.removeItem(CONSULTATION_POINTER_KEY);
        } finally {
          database.close();
        }
      });
    },
  };
}
