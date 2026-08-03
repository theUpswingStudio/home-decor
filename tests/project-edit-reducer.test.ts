import { describe, expect, it } from "vitest";
import {
  clampProjectQuantity,
  projectEntryKey,
  removeProjectEntry,
  saveProjectEntry,
  setProjectProductQuantity,
} from "@/lib/project-edit/reducer";
import type { ProjectEditEntry } from "@/lib/project-edit/types";

const candidate: ProjectEditEntry = {
  type: "product",
  productId: "product-a",
  quantity: 1,
  addedAt: 1,
};
const room: ProjectEditEntry = { type: "room", roomId: "room-a", addedAt: 2 };

describe("Project Edit reducer", () => {
  it("uses stable keys and clamps product quantities", () => {
    expect(projectEntryKey(candidate)).toBe("product:product-a:candidate");
    expect(projectEntryKey(room)).toBe("room:room-a");
    expect(clampProjectQuantity(-4)).toBe(1);
    expect(clampProjectQuantity(4.8)).toBe(4);
    expect(clampProjectQuantity(120)).toBe(99);
  });

  it("replaces an unconfigured product candidate with a configured save", () => {
    const configured: ProjectEditEntry = {
      type: "product",
      productId: "product-a",
      variantId: "variant-a",
      quantity: 2,
      addedAt: 3,
    };
    expect(saveProjectEntry([candidate, room], configured)).toEqual([room, configured]);
    const saved = [configured];
    expect(saveProjectEntry(saved, configured)).toBe(saved);
  });

  it("updates only configured product quantities and removes by key", () => {
    const configured: ProjectEditEntry = {
      type: "product",
      productId: "product-a",
      variantId: "variant-a",
      quantity: 1,
      addedAt: 3,
    };
    const entries = [configured, room] as const;
    expect(setProjectProductQuantity(entries, projectEntryKey(configured), 5)).toEqual([
      { ...configured, quantity: 5 },
      room,
    ]);
    expect(removeProjectEntry(entries, projectEntryKey(room))).toEqual([configured]);
  });
});
