import "server-only";

import type { RoomPreviewAspectRatio } from "./room-preview";

const OPENROUTER_IMAGE_ENDPOINT = "https://openrouter.ai/api/v1/images";
const IMAGE_REQUEST_TIMEOUT_MS = 175_000;
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DECODED_IMAGE_BYTES = 24 * 1024 * 1024;

const INPUT_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const OUTPUT_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type ImageRuntimeErrorKind =
  | "configuration"
  | "credit"
  | "moderation"
  | "rate-limit"
  | "timeout"
  | "provider"
  | "invalid-response";

export class ImageRuntimeError extends Error {
  readonly kind: ImageRuntimeErrorKind;
  readonly providerStatus: number | null;

  constructor(kind: ImageRuntimeErrorKind, providerStatus: number | null = null) {
    super(kind);
    this.name = "ImageRuntimeError";
    this.kind = kind;
    this.providerStatus = providerStatus;
  }
}

export interface ImageReference {
  readonly type: "image_url";
  readonly image_url: { readonly url: string };
}

export interface RoomPreviewRenderInput {
  readonly prompt: string;
  readonly aspectRatio: RoomPreviewAspectRatio;
  readonly references: readonly ImageReference[];
  readonly signal: AbortSignal;
}

export interface ImageRenderResult {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly model: string;
  readonly reportedCost: number | null;
}

export interface ImageRuntime {
  readonly provider: "openrouter";
  readonly model: string;
  renderRoomPreview(input: RoomPreviewRenderInput): Promise<ImageRenderResult>;
}

interface OpenRouterImageResponse {
  readonly data?: readonly { readonly b64_json?: unknown; readonly media_type?: unknown }[];
  readonly usage?: { readonly cost?: unknown };
}

interface OpenRouterRuntimeOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly appOrigin?: string;
  readonly fetch?: typeof fetch;
  readonly endpoint?: string;
  readonly timeoutMs?: number;
}

function errorKindForStatus(status: number, body: unknown): ImageRuntimeErrorKind {
  if (status === 402) return "credit";
  if (status === 408 || status === 504) return "timeout";
  if (status === 429) return "rate-limit";

  const serialized = JSON.stringify(body).toLowerCase();
  if (status === 400 || status === 403 || status === 422) {
    if (/moderation|safety|policy|content/.test(serialized)) return "moderation";
  }
  return "provider";
}

function parseOpenRouterResponse(payload: unknown, model: string): ImageRenderResult {
  if (typeof payload !== "object" || payload === null) {
    throw new ImageRuntimeError("invalid-response");
  }
  const response = payload as OpenRouterImageResponse;
  const image = response.data?.[0];
  if (!image || typeof image.b64_json !== "string" || image.b64_json.length === 0) {
    throw new ImageRuntimeError("invalid-response");
  }

  const mediaType = typeof image.media_type === "string" ? image.media_type : "image/png";
  if (!OUTPUT_MEDIA_TYPES.has(mediaType)) throw new ImageRuntimeError("invalid-response");

  const bytes = Buffer.from(image.b64_json, "base64");
  if (bytes.length === 0 || bytes.length > MAX_DECODED_IMAGE_BYTES) {
    throw new ImageRuntimeError("invalid-response");
  }

  return {
    bytes: new Uint8Array(bytes),
    mediaType,
    model,
    reportedCost: typeof response.usage?.cost === "number" ? response.usage.cost : null,
  };
}

async function embedRemoteReference(
  reference: ImageReference,
  request: typeof fetch,
  signal: AbortSignal,
): Promise<ImageReference> {
  const referenceUrl = reference.image_url.url;
  if (referenceUrl.startsWith("data:image/")) return reference;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(referenceUrl);
  } catch {
    throw new ImageRuntimeError("provider");
  }
  if (parsedUrl.protocol !== "https:") throw new ImageRuntimeError("provider");

  const response = await request(parsedUrl, {
    method: "GET",
    redirect: "follow",
    signal,
  });
  if (!response.ok) throw new ImageRuntimeError("provider", response.status);

  const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!mediaType || !INPUT_MEDIA_TYPES.has(mediaType)) {
    throw new ImageRuntimeError("invalid-response");
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REFERENCE_IMAGE_BYTES) {
    throw new ImageRuntimeError("invalid-response");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_REFERENCE_IMAGE_BYTES) {
    throw new ImageRuntimeError("invalid-response");
  }

  return {
    type: "image_url",
    image_url: { url: `data:${mediaType};base64,${bytes.toString("base64")}` },
  };
}

export function createOpenRouterImageRuntime(
  options: OpenRouterRuntimeOptions = {},
): ImageRuntime {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new ImageRuntimeError("configuration");

  const model = options.model ?? (process.env.OPENROUTER_IMAGE_MODEL?.trim() || "openai/gpt-image-2");
  const appOrigin = options.appOrigin ?? process.env.APP_ORIGIN?.trim();
  const request = options.fetch ?? fetch;
  const endpoint = options.endpoint ?? OPENROUTER_IMAGE_ENDPOINT;
  const timeoutMs = options.timeoutMs ?? IMAGE_REQUEST_TIMEOUT_MS;

  return {
    provider: "openrouter",
    model,
    async renderRoomPreview(input) {
      const timeoutController = new AbortController();
      const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
      const signal = AbortSignal.any([input.signal, timeoutController.signal]);

      try {
        const references = await Promise.all(
          input.references.map((reference) => embedRemoteReference(reference, request, signal)),
        );
        const headers = new Headers({
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Vestrel House Design with AI",
        });
        if (appOrigin) headers.set("HTTP-Referer", appOrigin);

        const response = await request(endpoint, {
          method: "POST",
          headers,
          signal,
          body: JSON.stringify({
            model,
            prompt: input.prompt,
            input_references: references,
            quality: "high",
            n: 1,
            background: "opaque",
            aspect_ratio: input.aspectRatio,
          }),
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new ImageRuntimeError(errorKindForStatus(response.status, payload), response.status);
        return parseOpenRouterResponse(payload, model);
      } catch (error) {
        if (error instanceof ImageRuntimeError) throw error;
        if (timeoutController.signal.aborted || (error instanceof DOMException && error.name === "TimeoutError")) {
          throw new ImageRuntimeError("timeout");
        }
        if (input.signal.aborted) throw new ImageRuntimeError("provider");
        throw new ImageRuntimeError("provider");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function getImageRuntime(): ImageRuntime {
  return createOpenRouterImageRuntime();
}
