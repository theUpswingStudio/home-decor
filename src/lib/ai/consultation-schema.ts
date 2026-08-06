import { z } from "zod";
import {
  BUDGET_OPTIONS,
  DIMENSION_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
} from "./consultation-types";

const roomIds = ROOM_OPTIONS.map((option) => option.value);
const dimensionModes = ["exact", ...DIMENSION_OPTIONS.map((option) => option.value)] as const;
const styles = STYLE_OPTIONS.map((option) => option.value);
const priorities = PRIORITY_OPTIONS.map((option) => option.value);
const budgets = BUDGET_OPTIONS.map((option) => option.value);

export const consultationIntakeSchema = z.object({
  roomId: z.enum(roomIds),
  dimensionMode: z.enum(dimensionModes),
  exactDimensions: z.object({
    widthFt: z.number().min(5).max(80),
    lengthFt: z.number().min(5).max(80),
    ceilingFt: z.number().min(6).max(30),
  }),
  style: z.enum(styles),
  priorities: z.array(z.enum(priorities)).min(1).max(4),
  budget: z.enum(budgets),
  notes: z.string().trim().max(600),
});

export const roomAnalysisSchema = z.object({
  summary: z.string().min(20).max(500),
  detectedRoomType: z.string().min(2).max(80),
  palette: z.object({
    dominantColors: z.array(z.string().min(2).max(40)).min(1).max(6),
    undertone: z.enum(["warm", "cool", "neutral", "mixed"]),
    contrast: z.enum(["low", "medium", "high"]),
  }),
  observations: z.array(z.object({
    label: z.string().min(2).max(60),
    detail: z.string().min(8).max(220),
    confidence: z.enum(["high", "medium", "low"]),
  })).min(2).max(6),
  searchSignals: z.object({
    styles: z.array(z.string().min(2).max(50)).max(8),
    materials: z.array(z.string().min(2).max(50)).max(8),
    productTypes: z.array(z.string().min(2).max(50)).max(8),
    avoid: z.array(z.string().min(2).max(80)).max(6),
  }),
  limitations: z.array(z.string().min(8).max(180)).min(1).max(5),
});

export const analyzeRequestSchema = z.object({
  action: z.literal("analyze"),
  intake: consultationIntakeSchema,
  imageDataUrl: z.string().max(8_500_000).refine(
    (value) => /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value),
    "Use a JPEG, PNG, or WebP image.",
  ),
});

export const recommendationContextSchema = z.object({
  analysis: roomAnalysisSchema,
  recommendations: z.array(z.object({
    productId: z.string().max(80),
    variantId: z.string().max(80),
  })).min(1).max(6),
});

export const chatRequestSchema = z.object({
  action: z.literal("chat"),
  messages: z.array(z.unknown()).min(1).max(40),
  intake: consultationIntakeSchema,
  context: recommendationContextSchema,
});
