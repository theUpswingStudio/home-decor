import { ZodError } from "zod";
import { previewRequestSchema } from "@/lib/ai/consultation-schema";
import { getImageRuntime, ImageRuntimeError } from "@/lib/ai/image-runtime";
import { PreviewAttemptError, runGuardedPreview } from "@/lib/ai/preview-guard";
import {
  ROOM_PREVIEW_PROMPT_VERSION,
  RoomPreviewValidationError,
  buildRoomPreviewPrompt,
  closestRoomPreviewAspectRatio,
  resolvePreviewProducts,
  roomPreviewSignature,
} from "@/lib/ai/room-preview";
import { protectAiRequest } from "@/lib/ai/security";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

function safeImageError(error: ImageRuntimeError): { readonly message: string; readonly status: number } {
  switch (error.kind) {
    case "configuration":
      return { message: "Image preview is unavailable because OpenRouter is not configured.", status: 503 };
    case "credit":
      return { message: "Image preview is paused because rendering credits are unavailable.", status: 402 };
    case "moderation":
      return { message: "The image service could not create a preview from these references.", status: 422 };
    case "rate-limit":
      return { message: "Image rendering is busy. Use your retry in a moment.", status: 429 };
    case "timeout":
      return { message: "The preview took too long to finish. Your recommendations are still available.", status: 504 };
    case "invalid-response":
      return { message: "The image service returned an unreadable preview. Your recommendations are still available.", status: 502 };
    default:
      return { message: "The image service could not finish this preview. Your recommendations are still available.", status: 502 };
  }
}

function logRender(fields: {
  readonly model: string;
  readonly durationMs: number;
  readonly referenceCount: number;
  readonly attempt: 1 | 2;
  readonly status: "success" | "failure";
  readonly reportedCost: number | null;
}): void {
  console.info("AI room preview", fields);
}

export async function POST(request: Request) {
  const protection = protectAiRequest(request);
  if (protection instanceof Response) return protection;

  const startedAt = Date.now();
  let model = process.env.OPENROUTER_IMAGE_MODEL?.trim() || "openai/gpt-image-2";
  let referenceCount = 0;
  let attempt: 1 | 2 = 1;

  try {
    const parsed = previewRequestSchema.parse(await request.json());
    attempt = parsed.attempt;
    const products = resolvePreviewProducts(parsed.products);
    referenceCount = products.length + 1;
    const signature = roomPreviewSignature(parsed.imageDataUrl, products);
    const runtime = getImageRuntime();
    model = runtime.model;
    const prompt = buildRoomPreviewPrompt(parsed.intake, products);
    const references = [
      { type: "image_url" as const, image_url: { url: parsed.imageDataUrl } },
      ...products.map((product) => ({
        type: "image_url" as const,
        image_url: { url: product.heroUrl },
      })),
    ];

    const result = await runGuardedPreview(
      protection.sessionId,
      parsed.attempt,
      signature,
      () => runtime.renderRoomPreview({
        prompt,
        references,
        aspectRatio: closestRoomPreviewAspectRatio(parsed.room.width, parsed.room.height),
        signal: request.signal,
      }),
    );

    logRender({
      model,
      durationMs: Date.now() - startedAt,
      referenceCount,
      attempt,
      status: "success",
      reportedCost: result.reportedCost,
    });

    const responseBody = new ArrayBuffer(result.bytes.byteLength);
    new Uint8Array(responseBody).set(result.bytes);
    return new Response(responseBody, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": result.mediaType,
        "X-AI-Image-Model": result.model,
        "X-AI-Prompt-Version": ROOM_PREVIEW_PROMPT_VERSION,
        "X-AI-Preview-Signature": signature,
        "X-AI-Preview-Attempt": String(parsed.attempt),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "Review the room image and product selection, then try again." },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: "The preview request body is not valid JSON." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof RoomPreviewValidationError) {
      return Response.json(
        { error: error.message },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof PreviewAttemptError) {
      return Response.json(
        { error: "This image attempt was already used. Start a new consultation for another render." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const runtimeError = error instanceof ImageRuntimeError
      ? error
      : new ImageRuntimeError("provider");
    const safe = safeImageError(runtimeError);
    logRender({
      model,
      durationMs: Date.now() - startedAt,
      referenceCount,
      attempt,
      status: "failure",
      reportedCost: null,
    });
    return Response.json(
      { error: safe.message },
      { status: safe.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
