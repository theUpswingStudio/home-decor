import "server-only";

import { Output, streamText } from "ai";
import { catalog, type Product, type ProductVariant } from "@/data/catalog";
import {
  BUDGET_OPTIONS,
  DIMENSION_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  getDimensionValues,
  type ConsultationIntake,
  type ConsultationResult,
  type ProductRecommendation,
  type RoomAnalysis,
} from "./consultation-types";
import { roomAnalysisSchema } from "./consultation-schema";
import { getAiProviderOptions, getAiRuntime } from "./model";

const STYLE_SIGNALS: Record<ConsultationIntake["style"], readonly string[]> = {
  "soft-modern": ["soft", "rounded", "tonal", "low profile", "curve"],
  "warm-natural": ["walnut", "oak", "ash", "linen", "wool", "natural", "warm"],
  "tailored-architectural": ["tailored", "architectural", "linear", "graphic", "pedestal"],
  sculptural: ["sculptural", "monolithic", "asymmetrical", "barrel", "cantilever"],
};

const PRIORITY_SIGNALS: Record<ConsultationIntake["priorities"][number], readonly string[]> = {
  conversation: ["sofa", "chair", "seating", "lounge"],
  reading: ["chair", "lamp", "reading", "daybed"],
  hosting: ["dining", "table", "bench", "sofa", "seats"],
  storage: ["storage", "cabinet", "drawer", "shelf", "credenza"],
  work: ["desk", "task", "workspace", "chair", "storage"],
  rest: ["bed", "daybed", "sofa", "soft", "upholstered"],
};

interface RankedProduct {
  readonly product: Product;
  readonly variant: ProductVariant;
  readonly score: number;
}

function labelFor<T extends readonly { readonly value: string; readonly label: string }[]>(
  options: T,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatPrice(valueMinor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valueMinor / 100);
}

function dimensionsFor(product: Product, variant: ProductVariant) {
  return variant.overallDimensions ?? product.dimensions.overall;
}

function formatDimensions(product: Product, variant: ProductVariant): string {
  const dimensions = dimensionsFor(product, variant);
  return `${dimensions.widthIn} W × ${dimensions.depthIn} D × ${dimensions.heightIn} H in`;
}

function normalizedProductText(product: Product): string {
  return [
    product.name,
    product.shortDescription,
    product.description,
    ...product.styleTags,
    ...product.materials,
    ...product.features,
  ].join(" ").toLowerCase();
}

function includesSignal(text: string, signal: string): boolean {
  return text.includes(signal.toLowerCase());
}

function rankProduct(
  product: Product,
  variant: ProductVariant,
  intake: ConsultationIntake,
  analysis: RoomAnalysis,
): number {
  const text = normalizedProductText(product);
  let score = product.roomIds.includes(intake.roomId) ? 12 : -12;

  for (const signal of STYLE_SIGNALS[intake.style]) {
    if (includesSignal(text, signal)) score += 3;
  }
  for (const priority of intake.priorities) {
    if (PRIORITY_SIGNALS[priority].some((signal) => includesSignal(text, signal))) score += 3;
  }
  for (const signal of [...analysis.searchSignals.styles, ...analysis.searchSignals.materials]) {
    if (includesSignal(text, signal)) score += 2;
  }
  for (const signal of analysis.searchSignals.avoid) {
    if (includesSignal(text, signal)) score -= 3;
  }

  const room = getDimensionValues(intake);
  const dimensions = dimensionsFor(product, variant);
  const roomWidthIn = Math.min(room.widthFt, room.lengthFt) * 12;
  const roomLengthIn = Math.max(room.widthFt, room.lengthFt) * 12;
  if (dimensions.widthIn <= roomLengthIn * 0.68 && dimensions.depthIn <= roomWidthIn * 0.52) {
    score += 4;
  } else {
    score -= 5;
  }

  const budget = BUDGET_OPTIONS.find((option) => option.value === intake.budget);
  if (budget?.maxMinor && variant.priceMinor <= budget.maxMinor * 0.5) score += 2;
  if (product.featuredRank) score += Math.max(0, 5 - product.featuredRank * 0.25);
  return score;
}

function reasonsFor(
  product: Product,
  variant: ProductVariant,
  intake: ConsultationIntake,
  analysis: RoomAnalysis,
): readonly string[] {
  const text = normalizedProductText(product);
  const styleSignal = STYLE_SIGNALS[intake.style].find((signal) => includesSignal(text, signal));
  const materialSignal = analysis.searchSignals.materials.find((signal) => includesSignal(text, signal));
  const priority = intake.priorities.find((value) =>
    PRIORITY_SIGNALS[value].some((signal) => includesSignal(text, signal)),
  );
  const dimensions = dimensionsFor(product, variant);
  const dimensionMode = intake.dimensionMode === "exact"
    ? "provided measurements"
    : `${labelFor(DIMENSION_OPTIONS, intake.dimensionMode).toLowerCase()} room assumption`;

  return [
    styleSignal
      ? `Supports the ${labelFor(STYLE_OPTIONS, intake.style).toLowerCase()} direction through its ${styleSignal} character.`
      : `Keeps the ${labelFor(STYLE_OPTIONS, intake.style).toLowerCase()} direction coherent without copying every existing finish.`,
    materialSignal
      ? `Connects with the room's visible ${materialSignal} cues.`
      : `Adds controlled material contrast to the observed ${analysis.palette.undertone} palette.`,
    priority
      ? `Helps the room support ${labelFor(PRIORITY_OPTIONS, priority).toLowerCase()}.`
      : `Adds a useful layer without competing with the room's main purpose.`,
    `Its ${dimensions.widthIn} × ${dimensions.depthIn} inch footprint is a provisional match for the ${dimensionMode}.`,
  ];
}

function recommendProducts(
  intake: ConsultationIntake,
  analysis: RoomAnalysis,
): readonly ProductRecommendation[] {
  const ranked: RankedProduct[] = [];
  for (const product of catalog.products) {
    if (!product.roomIds.includes(intake.roomId)) continue;
    const variants = product.variantIds
      .map((variantId) => catalog.variants.find((variant) => variant.id === variantId))
      .filter((variant): variant is ProductVariant => variant !== undefined)
      .toSorted((left, right) => left.priceMinor - right.priceMinor);
    const variant = variants[0];
    if (!variant) continue;
    ranked.push({ product, variant, score: rankProduct(product, variant, intake, analysis) });
  }
  ranked.sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name));

  const selected: RankedProduct[] = [];
  const usedCategories = new Set<string>();
  for (const candidate of ranked) {
    if (selected.length >= 3) break;
    if (usedCategories.has(candidate.product.categoryId)) continue;
    selected.push(candidate);
    usedCategories.add(candidate.product.categoryId);
  }
  for (const candidate of ranked) {
    if (selected.length >= 3) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected.map(({ product, variant }) => {
    const image = product.images.find((candidate) => candidate.role === "hero") ?? product.images[0];
    if (!image) throw new Error(`Product ${product.id} has no image.`);
    return {
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      description: product.shortDescription,
      productType: product.productType,
      finish: variant.options.map((option) => option.value).join(" / "),
      priceMinor: variant.priceMinor,
      priceLabel: formatPrice(variant.priceMinor),
      dimensionsLabel: formatDimensions(product, variant),
      image: {
        url: image.url,
        width: image.width,
        height: image.height,
        alt: image.alt,
      },
      reasons: reasonsFor(product, variant, intake, analysis),
    };
  });
}

function mockAnalysis(intake: ConsultationIntake): RoomAnalysis {
  const room = labelFor(ROOM_OPTIONS, intake.roomId);
  const style = labelFor(STYLE_OPTIONS, intake.style).toLowerCase();
  return {
    summary: `This ${room.toLowerCase()} reads as calm and usable, with a neutral base that can support a ${style} furniture edit.`,
    detectedRoomType: room,
    palette: {
      dominantColors: ["warm plaster", "oat", "weathered timber", "graphite"],
      undertone: "warm",
      contrast: "medium",
    },
    observations: [
      {
        label: "Natural light",
        detail: "The main window gives the room a clear daylight direction and keeps pale upholstery from reading flat.",
        confidence: "medium",
      },
      {
        label: "Visual weight",
        detail: "The room benefits from one grounded anchor and lighter supporting pieces around the circulation path.",
        confidence: "medium",
      },
      {
        label: "Material balance",
        detail: "Warm timber and tactile neutral textiles can connect the hard surfaces without making the room monochrome.",
        confidence: "medium",
      },
    ],
    searchSignals: {
      styles: [style, "collected modern", "soft geometry"],
      materials: ["walnut", "linen", "wool", "textured weave"],
      productTypes: ["seating", "table", "lighting"],
      avoid: ["overscaled sectional", "high-gloss finish"],
    },
    limitations: [
      "The image does not prove wall, doorway, or circulation dimensions.",
      "Confirm final fit, access, and finish samples with a consultant.",
    ],
  };
}

function analysisPrompt(intake: ConsultationIntake): string {
  const dimensions = getDimensionValues(intake);
  return [
    "Analyze this room image for an initial home-decor consultation.",
    `User-selected room: ${labelFor(ROOM_OPTIONS, intake.roomId)}.`,
    `Planning dimensions: ${dimensions.widthFt} × ${dimensions.lengthFt} ft with a ${dimensions.ceilingFt} ft ceiling.`,
    `Style direction: ${labelFor(STYLE_OPTIONS, intake.style)}.`,
    `Priorities: ${intake.priorities.map((value) => labelFor(PRIORITY_OPTIONS, value)).join(", ")}.`,
    `Investment range: ${labelFor(BUDGET_OPTIONS, intake.budget)}.`,
    intake.notes ? `Additional notes: ${intake.notes}` : "No additional notes were supplied.",
    "Describe only visible, broad observations. Never infer exact measurements from the image.",
    "Return useful color, material, scale, light, and circulation signals for catalog search.",
    "State limitations clearly. This is inspiration before a human consultant verifies fit.",
  ].join("\n");
}

export async function analyzeRoom(
  intake: ConsultationIntake,
  imageDataUrl: string,
  abortSignal: AbortSignal,
): Promise<ConsultationResult> {
  const runtime = getAiRuntime();
  let analysis: RoomAnalysis;
  if (runtime.mode === "mock") {
    analysis = mockAnalysis(intake);
  } else {
    const mediaType = imageDataUrl.slice(5, imageDataUrl.indexOf(";"));
    let providerStreamError: unknown;
    const result = streamText({
      model: runtime.model,
      abortSignal,
      providerOptions: getAiProviderOptions(runtime),
      maxRetries: 1,
      ...(runtime.label === "local-proxy" ? {} : { maxOutputTokens: 1_400 }),
      onError: ({ error }) => {
        providerStreamError = error;
      },
      output: Output.object({
        name: "room_analysis",
        description: "Broad visual observations and safe catalog-search signals for a home-decor consultation.",
        schema: roomAnalysisSchema,
      }),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: analysisPrompt(intake) },
          { type: "file", data: imageDataUrl, mediaType },
        ],
      }],
    });
    try {
      analysis = await result.output;
    } catch (error) {
      throw providerStreamError ?? error;
    }
  }

  const recommendations = recommendProducts(intake, analysis);
  const names = recommendations.map((product) => product.name).join(", ");
  return {
    generatedBy: runtime.mode === "mock" ? "demo" : "ai",
    analysis,
    recommendations,
    assistantMessage: `I read the room as ${analysis.summary.toLowerCase()} I shortlisted ${names}. These are starting points for discussion, not a final fit approval.`,
  };
}

export function buildChatSystemPrompt(
  intake: ConsultationIntake,
  analysis: RoomAnalysis,
  recommendationIds: readonly { readonly productId: string; readonly variantId: string }[],
): string {
  const verifiedProducts = recommendationIds.flatMap(({ productId, variantId }) => {
    const product = catalog.products.find((candidate) => candidate.id === productId);
    const variant = catalog.variants.find(
      (candidate) => candidate.id === variantId && candidate.productId === productId,
    );
    if (!product || !variant) return [];
    return [{
      name: product.name,
      description: product.shortDescription,
      materials: product.materials,
      features: product.features,
      finish: variant.options.map((option) => option.value).join(" / "),
      price: formatPrice(variant.priceMinor),
      dimensions: formatDimensions(product, variant),
      leadTime: variant.leadTimeLabel,
    }];
  });

  return [
    "You are the Vestrel House design assistant for an initial inspiration consultation.",
    "Use only the verified catalog facts below. Do not invent products, prices, finishes, dimensions, or availability.",
    "Explain recommendations in plain language. Keep most answers under 140 words.",
    "The room photo supports broad visual observations only. Never claim exact fit, safety, or construction facts.",
    "Ask for missing measurements when a question depends on them.",
    "Guide the user toward a sales or design consultant when they want final confirmation.",
    `Intake: ${JSON.stringify(intake)}.`,
    `Room analysis: ${JSON.stringify(analysis)}.`,
    `Verified recommendations: ${JSON.stringify(verifiedProducts)}.`,
  ].join("\n");
}
