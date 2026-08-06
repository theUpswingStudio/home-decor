export const PROJECT_EDIT_STORAGE_KEY = "vestrel-house:project-edit:v1";
export const PROJECT_EDIT_STORAGE_VERSION = 1 as const;
export const PROJECT_EDIT_RETENTION_DAYS = 30;
export const PROJECT_EDIT_TTL_MS =
  PROJECT_EDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const MAX_PROJECT_EDIT_ENTRIES = 50;
export const MIN_PROJECT_QUANTITY = 1;
export const MAX_PROJECT_QUANTITY = 99;

interface ProjectEditEntryBase {
  readonly addedAt: number;
}

export interface ProjectProductEntry extends ProjectEditEntryBase {
  readonly type: "product";
  readonly productId: string;
  readonly variantId?: string;
  readonly quantity: number;
  readonly roomId?: string;
}

export interface ProjectRoomEntry extends ProjectEditEntryBase {
  readonly type: "room";
  readonly roomId: string;
}

export interface ProjectMaterialEntry extends ProjectEditEntryBase {
  readonly type: "material";
  readonly collectionId: string;
}

export type ProjectEditEntry =
  | ProjectProductEntry
  | ProjectRoomEntry
  | ProjectMaterialEntry;

export interface ProjectEditStorageEnvelope {
  readonly version: typeof PROJECT_EDIT_STORAGE_VERSION;
  readonly updatedAt: number;
  readonly entries: readonly ProjectEditEntry[];
}

export type ProjectEditPersistence = "local" | "memory";

export interface ProjectEditSnapshot {
  readonly status: "loading" | "ready";
  readonly updatedAt: number | null;
  readonly entries: readonly ProjectEditEntry[];
  readonly persistence: ProjectEditPersistence;
}

export type SaveProjectEntryResult =
  | { readonly changed: true; readonly entryCount: number }
  | {
      readonly changed: false;
      readonly reason: "invalid" | "unavailable" | "entry-limit" | "already-saved";
      readonly entryCount: number;
    };

export interface ProjectProductConfiguration {
  readonly productId: string;
  readonly variantId: string;
  readonly quantity?: number;
}

export type SaveProjectConfigurationResult =
  | { readonly changed: true; readonly entryCount: number; readonly savedCount: number }
  | {
      readonly changed: false;
      readonly reason: "invalid" | "unavailable" | "entry-limit" | "already-saved";
      readonly entryCount: number;
      readonly savedCount: 0;
    };
