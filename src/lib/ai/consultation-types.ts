export const ROOM_OPTIONS = [
  { value: "room-living", label: "Living room" },
  { value: "room-dining", label: "Dining room" },
  { value: "room-bedroom", label: "Bedroom" },
  { value: "room-workspace", label: "Workspace" },
] as const;

export const DIMENSION_OPTIONS = [
  {
    value: "small",
    label: "Small",
    dimensions: "10 × 12 ft",
    widthFt: 10,
    lengthFt: 12,
  },
  {
    value: "medium",
    label: "Medium",
    dimensions: "14 × 18 ft",
    widthFt: 14,
    lengthFt: 18,
  },
  {
    value: "large",
    label: "Large",
    dimensions: "18 × 24 ft",
    widthFt: 18,
    lengthFt: 24,
  },
] as const;

export const STYLE_OPTIONS = [
  { value: "soft-modern", label: "Soft modern" },
  { value: "warm-natural", label: "Warm and natural" },
  { value: "tailored-architectural", label: "Tailored and architectural" },
  { value: "sculptural", label: "Sculptural and expressive" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "conversation", label: "Conversation" },
  { value: "reading", label: "Reading" },
  { value: "hosting", label: "Hosting" },
  { value: "storage", label: "Storage" },
  { value: "work", label: "Focused work" },
  { value: "rest", label: "Rest and reset" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "under-10", label: "Under $10,000", minMinor: 0, maxMinor: 1_000_000 },
  { value: "10-20", label: "$10,000–$20,000", minMinor: 1_000_000, maxMinor: 2_000_000 },
  { value: "20-35", label: "$20,000–$35,000", minMinor: 2_000_000, maxMinor: 3_500_000 },
  { value: "35-plus", label: "$35,000+", minMinor: 3_500_000, maxMinor: null },
] as const;

type OptionValue<T extends readonly { readonly value: string }[]> = T[number]["value"];

export type ConsultationRoomId = OptionValue<typeof ROOM_OPTIONS>;
export type DimensionMode = "exact" | OptionValue<typeof DIMENSION_OPTIONS>;
export type ConsultationStyle = OptionValue<typeof STYLE_OPTIONS>;
export type ConsultationPriority = OptionValue<typeof PRIORITY_OPTIONS>;
export type ConsultationBudget = OptionValue<typeof BUDGET_OPTIONS>;

export interface ExactDimensions {
  readonly widthFt: number;
  readonly lengthFt: number;
  readonly ceilingFt: number;
}

export interface ConsultationIntake {
  readonly roomId: ConsultationRoomId;
  readonly dimensionMode: DimensionMode;
  readonly exactDimensions: ExactDimensions;
  readonly style: ConsultationStyle;
  readonly priorities: readonly ConsultationPriority[];
  readonly budget: ConsultationBudget;
  readonly notes: string;
}

export interface AnalysisObservation {
  readonly label: string;
  readonly detail: string;
  readonly confidence: "high" | "medium" | "low";
}

export interface RoomAnalysis {
  readonly summary: string;
  readonly detectedRoomType: string;
  readonly palette: {
    readonly dominantColors: readonly string[];
    readonly undertone: "warm" | "cool" | "neutral" | "mixed";
    readonly contrast: "low" | "medium" | "high";
  };
  readonly observations: readonly AnalysisObservation[];
  readonly searchSignals: {
    readonly styles: readonly string[];
    readonly materials: readonly string[];
    readonly productTypes: readonly string[];
    readonly avoid: readonly string[];
  };
  readonly limitations: readonly string[];
}

export interface ConsultationImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

export interface ProductRecommendation {
  readonly productId: string;
  readonly variantId: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly productType: string;
  readonly finish: string;
  readonly priceMinor: number;
  readonly priceLabel: string;
  readonly dimensionsLabel: string;
  readonly image: ConsultationImage;
  readonly reasons: readonly string[];
}

export interface ConsultationResult {
  readonly generatedBy: "ai" | "demo";
  readonly assistantMessage: string;
  readonly analysis: RoomAnalysis;
  readonly recommendations: readonly ProductRecommendation[];
}

export interface PreparedRoomAsset {
  readonly assetId: string;
  readonly blob: Blob;
  readonly fileName: string;
  readonly mediaType: "image/jpeg";
  readonly width: number;
  readonly height: number;
}

export type ConsultationPreviewStatus =
  | "idle"
  | "rendering"
  | "ready"
  | "unavailable"
  | "error";

export interface ConsultationPreview {
  readonly status: ConsultationPreviewStatus;
  readonly attempt: 0 | 1 | 2;
  readonly blob: Blob | null;
  readonly mediaType: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly signature: string;
  readonly productIds: readonly string[];
  readonly createdAt: number | null;
  readonly error: string;
}

export const EMPTY_CONSULTATION_PREVIEW: ConsultationPreview = {
  status: "idle",
  attempt: 0,
  blob: null,
  mediaType: "",
  model: "",
  promptVersion: "",
  signature: "",
  productIds: [],
  createdAt: null,
  error: "",
};

export const DEFAULT_CONSULTATION_INTAKE: ConsultationIntake = {
  roomId: "room-living",
  dimensionMode: "medium",
  exactDimensions: { widthFt: 14, lengthFt: 18, ceilingFt: 9 },
  style: "soft-modern",
  priorities: ["conversation", "reading"],
  budget: "10-20",
  notes: "",
};

export function getDimensionValues(intake: ConsultationIntake): ExactDimensions {
  if (intake.dimensionMode === "exact") return intake.exactDimensions;
  const preset = DIMENSION_OPTIONS.find((option) => option.value === intake.dimensionMode);
  return {
    widthFt: preset?.widthFt ?? 14,
    lengthFt: preset?.lengthFt ?? 18,
    ceilingFt: intake.exactDimensions.ceilingFt,
  };
}
