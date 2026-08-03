import {
  MAX_PROJECT_EDIT_ENTRIES,
  MAX_PROJECT_QUANTITY,
  MIN_PROJECT_QUANTITY,
  type ProjectEditEntry,
  type ProjectProductEntry,
} from "./types";

export function clampProjectQuantity(quantity: number): number {
  return Math.min(
    MAX_PROJECT_QUANTITY,
    Math.max(MIN_PROJECT_QUANTITY, Math.trunc(quantity)),
  );
}

export function projectEntryKey(entry: ProjectEditEntry): string {
  switch (entry.type) {
    case "product":
      return `product:${entry.productId}:${entry.variantId ?? "candidate"}`;
    case "room":
      return `room:${entry.roomId}`;
    case "material":
      return `material:${entry.collectionId}`;
  }
}

export function saveProjectEntry(
  entries: readonly ProjectEditEntry[],
  entry: ProjectEditEntry,
): readonly ProjectEditEntry[] {
  const key = projectEntryKey(entry);
  const existing = entries.find((candidate) => projectEntryKey(candidate) === key);
  if (existing) return entries;

  let nextEntries = entries;
  if (entry.type === "product" && entry.variantId) {
    nextEntries = entries.filter(
      (candidate) =>
        candidate.type !== "product" ||
        candidate.productId !== entry.productId ||
        candidate.variantId !== undefined,
    );
  }

  if (nextEntries.length >= MAX_PROJECT_EDIT_ENTRIES) return entries;
  return [...nextEntries, entry];
}

export function removeProjectEntry(
  entries: readonly ProjectEditEntry[],
  key: string,
): readonly ProjectEditEntry[] {
  const nextEntries = entries.filter((entry) => projectEntryKey(entry) !== key);
  return nextEntries.length === entries.length ? entries : nextEntries;
}

export function setProjectProductQuantity(
  entries: readonly ProjectEditEntry[],
  key: string,
  quantity: number,
): readonly ProjectEditEntry[] {
  const normalizedQuantity = clampProjectQuantity(quantity);
  let changed = false;
  const nextEntries = entries.map((entry) => {
    if (
      entry.type !== "product" ||
      projectEntryKey(entry) !== key ||
      entry.quantity === normalizedQuantity
    ) {
      return entry;
    }
    changed = true;
    return { ...entry, quantity: normalizedQuantity } satisfies ProjectProductEntry;
  });
  return changed ? nextEntries : entries;
}
