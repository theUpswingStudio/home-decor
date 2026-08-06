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
});
