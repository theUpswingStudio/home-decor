import { createHash } from "node:crypto";
import { catalog, type Product, type ProductVariant } from "@/data/catalog";
import {
  BUDGET_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  getDimensionValues,
  type ConsultationIntake,
} from "./consultation-types";

export const ROOM_PREVIEW_PROMPT_VERSION = "room-preview-v1";

const SUPPORTED_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "21:9",
] as const;

export type RoomPreviewAspectRatio = typeof SUPPORTED_ASPECT_RATIOS[number];

export interface PreviewProductPair {
  readonly productId: string;
  readonly variantId: string;
}

export interface ResolvedPreviewProduct {
  readonly product: Product;
  readonly variant: ProductVariant;
  readonly categoryName: string;
  readonly heroUrl: string;
}

export class RoomPreviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomPreviewValidationError";
  }
}

function optionLabel(
  options: readonly { readonly value: string; readonly label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function dimensionsFor(product: Product, variant: ProductVariant): string {
  const dimensions = variant.overallDimensions ?? product.dimensions.overall;
  return `${dimensions.widthIn} W × ${dimensions.depthIn} D × ${dimensions.heightIn} H inches`;
}

export function closestRoomPreviewAspectRatio(width: number, height: number): RoomPreviewAspectRatio {
  const sourceRatio = width / height;
  let closest: RoomPreviewAspectRatio = SUPPORTED_ASPECT_RATIOS[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of SUPPORTED_ASPECT_RATIOS) {
    const [candidateWidth, candidateHeight] = candidate.split(":").map(Number);
    const distance = Math.abs(Math.log(sourceRatio / (candidateWidth / candidateHeight)));
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closest;
}

export function resolvePreviewProducts(
  pairs: readonly PreviewProductPair[],
): readonly ResolvedPreviewProduct[] {
  return pairs.map(({ productId, variantId }) => {
    const product = catalog.products.find((candidate) => candidate.id === productId);
    if (!product) throw new RoomPreviewValidationError("One selected product is not in the catalog.");

    const variant = catalog.variants.find((candidate) => candidate.id === variantId);
    if (!variant || variant.productId !== product.id || !product.variantIds.includes(variant.id)) {
      throw new RoomPreviewValidationError("One selected finish does not belong to its product.");
    }

    const hero = product.images.find((image) => image.role === "hero");
    if (!hero) throw new RoomPreviewValidationError("One selected product has no hero image.");

    return {
      product,
      variant,
      categoryName: catalog.categories.find((category) => category.id === product.categoryId)?.name
        ?? product.productType,
      heroUrl: hero.url,
    };
  });
}

export function buildRoomPreviewPrompt(
  intake: ConsultationIntake,
  products: readonly ResolvedPreviewProduct[],
): string {
  const roomDimensions = getDimensionValues(intake);
  const productInstructions = products.map(({ product, variant, categoryName }, index) => {
    const finish = variant.options.map((option) => `${option.name}: ${option.value}`).join(", ");
    return [
      `Reference ${index + 2}: ${product.name}.`,
      `Type: ${categoryName}.`,
      `Finish: ${finish}.`,
      `Dimensions: ${dimensionsFor(product, variant)}.`,
      `Visual facts: ${product.shortDescription}`,
    ].join(" ");
  });

  return [
    `Instruction set ${ROOM_PREVIEW_PROMPT_VERSION}.`,
    "Create one photorealistic interior design concept from the supplied references.",
    "Reference 1 is the user's room and is the fixed base scene.",
    "Preserve its architecture, camera position, lens perspective, crop, flooring, windows, doors, walls, ceiling, and lighting direction.",
    "Do not rebuild, extend, mirror, or change the room shell.",
    `Treat it as a ${optionLabel(ROOM_OPTIONS, intake.roomId).toLowerCase()} measuring approximately ${roomDimensions.widthFt} × ${roomDimensions.lengthFt} feet, with a ${roomDimensions.ceilingFt}-foot ceiling.`,
    `The requested direction is ${optionLabel(STYLE_OPTIONS, intake.style).toLowerCase()}.`,
    `The room should support ${intake.priorities.map((priority) => optionLabel(PRIORITY_OPTIONS, priority).toLowerCase()).join(", ")}.`,
    `The planning budget is ${optionLabel(BUDGET_OPTIONS, intake.budget)}.`,
    intake.notes ? `Honor this user note where it is visible and safe: ${intake.notes}` : "No extra user note applies.",
    "Use each later reference as a visual guide for one specified catalog product.",
    "Replace visible furniture with the referenced product when its type matches.",
    "Add a referenced product only when no matching item exists and the placement feels natural.",
    "Keep clear circulation. Do not crowd doors, windows, or walkways.",
    "Preserve each product's recognizable silhouette, material, finish, and proportions as closely as possible.",
    "Remove conflicting old furniture only where needed. Keep unrelated architecture and decor stable.",
    "Do not add labels, captions, logos, people, watermarks, floor plans, or split-screen elements.",
    "Return one finished room photograph with an opaque background.",
    ...productInstructions,
  ].join("\n");
}

export function roomPreviewSignature(
  imageDataUrl: string,
  products: readonly ResolvedPreviewProduct[],
): string {
  const productSignature = products
    .map(({ product, variant }) => `${product.id}:${variant.id}`)
    .join("|");
  return createHash("sha256")
    .update(ROOM_PREVIEW_PROMPT_VERSION)
    .update("\0")
    .update(imageDataUrl)
    .update("\0")
    .update(productSignature)
    .digest("base64url");
}
