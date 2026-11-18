import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import {
  CONSULTATION_POINTER_KEY,
  CONSULTATION_RETENTION_MS,
  CONSULTATION_STORAGE_VERSION,
  createConsultationStorage,
  type SavedConsultationRecord,
} from "@/lib/ai/consultation-storage";
import {
  DEFAULT_CONSULTATION_INTAKE,
  EMPTY_CONSULTATION_PREVIEW,
} from "@/lib/ai/consultation-types";

class MemoryPointerStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function record(id: string): Omit<SavedConsultationRecord, "updatedAt" | "expiresAt"> {
  return {
    version: CONSULTATION_STORAGE_VERSION,
    id,
    step: 5,
    intake: DEFAULT_CONSULTATION_INTAKE,
    room: {
      assetId: "bd0c3d44-6cbc-491a-a351-77c2c5fb69c8",
      blob: new Blob(["room"], { type: "image/jpeg" }),
      fileName: "room.jpg",
      mediaType: "image/jpeg",
      width: 1_600,
      height: 1_000,
    },
    result: null,
    selectedProductIds: ["product-one"],
    preview: {
      ...EMPTY_CONSULTATION_PREVIEW,
      status: "ready",
      attempt: 1,
      blob: new Blob(["preview"], { type: "image/png" }),
      mediaType: "image/png",
      model: "openai/gpt-image-2",
      promptVersion: "room-preview-v1",
      signature: "signature",
      productIds: ["product-one"],
      createdAt: 1_000,
    },
  };
}

describe("consultation IndexedDB storage", () => {
  it("waits for an earlier save before loading the latest record", async () => {
    const storage = createConsultationStorage({
      indexedDB: new IDBFactory(), localStorage: new MemoryPointerStorage(),
    });
    const saving = storage.save(record("pending-save"));
    const loading = storage.loadLatest();

    await saving;
    await expect(loading).resolves.toMatchObject({ id: "pending-save" });
  });

  it("clears a save that was still pending when reset was requested", async () => {
    const pointers = new MemoryPointerStorage();
    const storage = createConsultationStorage({ indexedDB: new IDBFactory(), localStorage: pointers });
    const saving = storage.save(record("discarded"));
    const clearing = storage.clear();

    await Promise.all([saving, clearing]);
    await expect(storage.loadLatest()).resolves.toBeNull();
    expect(pointers.getItem(CONSULTATION_POINTER_KEY)).toBeNull();
  });

  it("orders a new draft after clearing a pending old draft", async () => {
    const storage = createConsultationStorage({
      indexedDB: new IDBFactory(), localStorage: new MemoryPointerStorage(),
    });
    const savingOld = storage.save(record("old-draft"));
    const clearing = storage.clear();
    const savingNew = storage.save(record("new-draft"));

    await Promise.all([savingOld, clearing, savingNew]);
    await expect(storage.loadLatest()).resolves.toMatchObject({ id: "new-draft" });
  });

  it("saves and restores room and preview blobs without chat data", async () => {
    const pointers = new MemoryPointerStorage();
    const storage = createConsultationStorage({
      indexedDB: new IDBFactory(),
      localStorage: pointers,
      now: () => 1_000,
    });
    const saved = record("consultation-one");

    await storage.save(saved);
    const restored = await storage.loadLatest();

    expect(pointers.getItem(CONSULTATION_POINTER_KEY)).toBe(saved.id);
    expect(await restored?.room.blob.text()).toBe("room");
    expect(await restored?.preview.blob?.text()).toBe("preview");
    expect(restored).not.toHaveProperty("messages");
  });

  it("deletes a record after seven days", async () => {
    let now = 1_000;
    const pointers = new MemoryPointerStorage();
    const storage = createConsultationStorage({
      indexedDB: new IDBFactory(),
      localStorage: pointers,
      now: () => now,
    });

    await storage.save(record("expiring-consultation"));
    now += CONSULTATION_RETENTION_MS + 1;

    await expect(storage.loadLatest()).resolves.toBeNull();
    expect(pointers.getItem(CONSULTATION_POINTER_KEY)).toBeNull();
  });

  it("clears every saved consultation and latest pointer", async () => {
    const pointers = new MemoryPointerStorage();
    const storage = createConsultationStorage({
      indexedDB: new IDBFactory(),
      localStorage: pointers,
      now: () => 1_000,
    });
    await storage.save(record("consultation-to-clear"));

    await storage.clear();

    await expect(storage.loadLatest()).resolves.toBeNull();
    expect(pointers.getItem(CONSULTATION_POINTER_KEY)).toBeNull();
  });
  it("keeps the write queue usable after failure", async () => {
    const pointers = new MemoryPointerStorage();
    let fail = true;
    const storage = createConsultationStorage({ indexedDB: new IDBFactory(), localStorage: {
      getItem: (key) => pointers.getItem(key),
      removeItem: (key) => pointers.removeItem(key),
      setItem: (key, value) => {
        if (fail) { fail = false; throw new Error("Storage full"); }
        pointers.setItem(key, value);
      },
    } });
    const failed = storage.save(record("old"));
    const clear = storage.clear();
    const saved = storage.save(record("new"));
    await expect(failed).rejects.toThrow("Storage full");
    await Promise.all([clear, saved]);
    expect((await storage.loadLatest())?.id).toBe("new");
  });

});
