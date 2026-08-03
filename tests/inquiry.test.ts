import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildInquiryContext,
  demonstrateInquirySubmission,
  isSupportedPostalCode,
  type InquirySubmission,
} from "@/components/inquiry/inquiry-types";
import { catalog } from "@/data/catalog";

const submission: InquirySubmission = {
  version: 1,
  project: {
    designService: "service-room-plan",
    scope: "scope-living",
    postalCode: "10001",
    timeline: "timeline-flexible",
    investment: "investment-15-35",
  },
  contact: {
    fullName: "Alex Morgan",
    email: "alex@example.test",
  },
  context: {
    source: "direct",
    selectedItems: [],
    selectedEntries: [],
  },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("inquiry contract", () => {
  it("uses the approved contact fields without contact-preference options", () => {
    expect(catalog.inquiry.steps[1].fields).toEqual([
      "fullName",
      "email",
      "phone",
      "notes",
    ]);
    expect(catalog.inquiry).not.toHaveProperty("contactPreferenceOptions");
  });

  it("preserves configured products and typed entries for Project Edit", () => {
    const items = [
      { variantId: "variant-a", quantity: 2 },
      { variantId: "variant-b", quantity: 1 },
    ];

    expect(buildInquiryContext("cart", items)).toEqual({
      source: "cart",
      selectedItems: items,
      selectedEntries: [],
    });
    const entries = [
      { type: "room" as const, roomId: "room-a" },
      { type: "material" as const, collectionId: "collection-a" },
    ];
    expect(buildInquiryContext("project-edit", items, entries)).toEqual({
      source: "project-edit",
      selectedItems: items,
      selectedEntries: entries,
    });
    expect(buildInquiryContext("direct", items)).toEqual({
      source: "direct",
      selectedItems: [],
      selectedEntries: [],
    });
  });

  it("logs the demonstration payload only in development", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});

    vi.stubEnv("NODE_ENV", "development");
    expect(demonstrateInquirySubmission(submission)).toEqual({
      status: "demonstration-only",
    });
    expect(consoleInfo).toHaveBeenCalledWith(
      "Vestrel inquiry demonstration payload; not transmitted:",
      submission,
    );

    consoleInfo.mockClear();
    vi.stubEnv("NODE_ENV", "production");
    demonstrateInquirySubmission(submission);
    expect(consoleInfo).not.toHaveBeenCalled();
  });
});

describe("inquiry postal-code validation", () => {
  it.each(["10001", "10001-1234", "K1A0B1", "k1a 0b1", "  H0H 0H0  "])(
    "accepts supported US and Canadian value %s",
    (postalCode) => {
      expect(isSupportedPostalCode(postalCode)).toBe(true);
    },
  );

  it.each([
    "SW1A 1AA",
    "EC1A 1BB",
    "1234",
    "123456",
    "K1A-0B1",
    "D1A 0B1",
    "90210 1234",
  ])("rejects unsupported value %s", (postalCode) => {
    expect(isSupportedPostalCode(postalCode)).toBe(false);
  });
});
