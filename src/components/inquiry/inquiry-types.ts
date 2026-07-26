export type InquirySource = "direct" | "cart";

export interface InquirySelectedItem {
  readonly variantId: string;
  readonly quantity: number;
}

export interface InquiryContext {
  readonly source: InquirySource;
  readonly selectedItems: readonly InquirySelectedItem[];
}

export interface InquirySubmission {
  readonly version: 1;
  readonly project: {
    readonly designService: string;
    readonly scope: string;
    readonly postalCode: string;
    readonly timeline: string;
    readonly investment: string;
  };
  readonly contact: {
    readonly fullName: string;
    readonly email: string;
    readonly phone?: string;
    readonly notes?: string;
  };
  readonly context: InquiryContext;
}

export interface InquirySubmissionReceipt {
  readonly status: "accepted" | "rejected";
  readonly reference?: string;
}

/** Future server endpoint or Google Sheets adapter boundary. */
export type InquirySubmissionTransport = (
  submission: InquirySubmission,
) => Promise<InquirySubmissionReceipt>;

export interface DemonstrationReceipt {
  readonly status: "demonstration-only";
}

const US_ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;
const CANADIAN_POSTAL_PATTERN =
  /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTVWXYZ] ?\d[ABCEGHJ-NPRSTVWXYZ]\d$/i;

export function isSupportedPostalCode(value: string): boolean {
  const postalCode = value.trim();
  return (
    US_ZIP_PATTERN.test(postalCode) || CANADIAN_POSTAL_PATTERN.test(postalCode)
  );
}

export function buildInquiryContext(
  source: InquirySource,
  items: readonly InquirySelectedItem[],
): InquiryContext {
  return {
    source,
    selectedItems:
      source === "cart"
        ? items.map(({ variantId, quantity }) => ({ variantId, quantity }))
        : [],
  };
}

export function demonstrateInquirySubmission(
  submission: InquirySubmission,
): DemonstrationReceipt {
  if (process.env.NODE_ENV === "development") {
    console.info(
      "Vestrel inquiry demonstration payload; not transmitted:",
      submission,
    );
  }

  return { status: "demonstration-only" };
}
