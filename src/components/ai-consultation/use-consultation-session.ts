"use client";

import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONSULTATION_STORAGE_VERSION,
  createConsultationStorage,
  type SavedConsultationRecord,
} from "@/lib/ai/consultation-storage";
import {
  DEFAULT_CONSULTATION_INTAKE,
  EMPTY_CONSULTATION_PREVIEW,
  type ConsultationIntake,
  type ConsultationPreview,
  type ConsultationResult,
  type PreparedRoomAsset,
} from "@/lib/ai/consultation-types";

const LEGACY_SESSION_STORAGE_KEY = "vestrel-house:ai-consultation:v2";
const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1_600;

export interface ConsultationSessionState {
  readonly version: typeof CONSULTATION_STORAGE_VERSION;
  readonly id: string;
  readonly step: number;
  readonly intake: ConsultationIntake;
  readonly room: PreparedRoomAsset | null;
  readonly result: ConsultationResult | null;
  readonly selectedProductIds: readonly string[];
  readonly messages: readonly UIMessage[];
  readonly preview: ConsultationPreview;
}

function createSession(): ConsultationSessionState {
  return {
    version: CONSULTATION_STORAGE_VERSION,
    id: crypto.randomUUID(),
    step: 1,
    intake: DEFAULT_CONSULTATION_INTAKE,
    room: null,
    result: null,
    selectedProductIds: [],
    messages: [],
    preview: EMPTY_CONSULTATION_PREVIEW,
  };
}

function restoreSession(record: SavedConsultationRecord): ConsultationSessionState {
  const interruptedPreview = record.preview.status === "rendering";
  return {
    version: CONSULTATION_STORAGE_VERSION,
    id: record.id,
    step: record.step,
    intake: record.intake,
    room: record.room,
    result: record.result,
    selectedProductIds: record.selectedProductIds,
    messages: [],
    preview: interruptedPreview
      ? {
          ...record.preview,
          status: "error",
          error: "The previous image render was interrupted. Use your retry to continue.",
        }
      : record.preview,
  };
}

function persistedRecord(
  state: ConsultationSessionState,
): Omit<SavedConsultationRecord, "updatedAt" | "expiresAt"> | null {
  if (!state.room) return null;
  return {
    version: CONSULTATION_STORAGE_VERSION,
    id: state.id,
    step: state.step,
    intake: state.intake,
    room: state.room,
    result: state.result,
    selectedProductIds: state.selectedProductIds,
    preview: state.preview,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not prepare this image."));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.84);
  });
}

export async function prepareRoomImage(file: File): Promise<PreparedRoomAsset> {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("Choose an image smaller than 8 MB.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("The browser could not prepare this image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return {
      assetId: crypto.randomUUID(),
      blob: await canvasToBlob(canvas),
      fileName: file.name,
      mediaType: "image/jpeg",
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}

function useBlobUrl(blob: Blob | null): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) {
      let active = true;
      queueMicrotask(() => {
        if (active) setUrl("");
      });
      return () => {
        active = false;
      };
    }
    const objectUrl = URL.createObjectURL(blob);
    let active = true;
    queueMicrotask(() => {
      if (active) setUrl(objectUrl);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);
  return url;
}

export function useConsultationSession() {
  const storage = useMemo(() => createConsultationStorage(), []);
  const [state, setState] = useState<ConsultationSessionState>(() => createSession());
  const [ready, setReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);
  const roomUrl = useBlobUrl(state.room?.blob ?? null);
  const previewUrl = useBlobUrl(state.preview.blob);
  const {
    id,
    step,
    intake,
    room,
    result,
    selectedProductIds,
    preview,
  } = state;
  const durableRecord = useMemo(() => persistedRecord({
    version: CONSULTATION_STORAGE_VERSION,
    id,
    step,
    intake,
    room,
    result,
    selectedProductIds,
    messages: [],
    preview,
  }), [id, intake, preview, result, room, selectedProductIds, step]);

  useEffect(() => {
    let active = true;
    try {
      window.sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    } catch {
      // IndexedDB remains the only durable store for image bytes.
    }
    void storage.loadLatest()
      .then((saved) => {
        if (active && saved) setState(restoreSession(saved));
      })
      .catch(() => {
        if (active) setPersistenceError(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [storage]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const operation = durableRecord ? storage.save(durableRecord) : storage.clear();
      void operation
        .then(() => setPersistenceError(false))
        .catch(() => setPersistenceError(true));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [
    ready,
    durableRecord,
    storage,
  ]);

  const clearResult = useCallback((current: ConsultationSessionState) => ({
    ...current,
    result: null,
    selectedProductIds: [],
    messages: [],
    preview: EMPTY_CONSULTATION_PREVIEW,
  }), []);

  const updateIntake = useCallback((patch: Partial<ConsultationIntake>) => {
    setState((current) => clearResult({
      ...current,
      intake: { ...current.intake, ...patch },
    }));
  }, [clearResult]);

  const setRoom = useCallback((room: PreparedRoomAsset) => {
    setState((current) => clearResult({ ...current, room }));
  }, [clearResult]);

  const setStep = useCallback((step: number) => {
    setState((current) => ({ ...current, step: Math.min(5, Math.max(1, step)) }));
  }, []);

  const setResult = useCallback((result: ConsultationResult) => {
    setState((current) => ({
      ...current,
      step: 5,
      result,
      selectedProductIds: result.recommendations.map((product) => product.productId),
      messages: [],
      preview: EMPTY_CONSULTATION_PREVIEW,
    }));
  }, []);

  const reviseBrief = useCallback(() => {
    setState((current) => ({
      ...current,
      step: 4,
      result: null,
      selectedProductIds: [],
      messages: [],
      preview: EMPTY_CONSULTATION_PREVIEW,
    }));
  }, []);

  const setSelectedProductIds = useCallback((selectedProductIds: readonly string[]) => {
    setState((current) => ({ ...current, selectedProductIds }));
  }, []);

  const setMessages = useCallback((messages: readonly UIMessage[]) => {
    setState((current) => ({ ...current, messages }));
  }, []);

  const beginPreview = useCallback((attempt: 1 | 2, productIds: readonly string[]) => {
    setState((current) => ({
      ...current,
      preview: {
        ...EMPTY_CONSULTATION_PREVIEW,
        status: "rendering",
        attempt,
        productIds,
      },
    }));
  }, []);

  const completePreview = useCallback((preview: ConsultationPreview) => {
    setState((current) => ({ ...current, preview }));
  }, []);

  const failPreview = useCallback((status: "error" | "unavailable", error: string) => {
    setState((current) => ({
      ...current,
      preview: { ...current.preview, status, blob: null, error },
    }));
  }, []);

  const reset = useCallback(() => {
    setState(createSession());
    void storage.clear()
      .then(() => setPersistenceError(false))
      .catch(() => setPersistenceError(true));
  }, [storage]);

  return {
    state,
    ready,
    persistenceError,
    roomUrl,
    previewUrl,
    updateIntake,
    setRoom,
    setStep,
    setResult,
    reviseBrief,
    setSelectedProductIds,
    setMessages,
    beginPreview,
    completePreview,
    failPreview,
    reset,
  };
}

async function requestAiSession(signal?: AbortSignal): Promise<{
  readonly csrfToken: string;
  readonly previewAvailable: boolean;
}> {
  const response = await fetch("/api/ai/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal,
  });
  const payload = await response.json() as {
    csrfToken?: string;
    previewAvailable?: boolean;
    error?: string;
  };
  if (!response.ok || !payload.csrfToken) {
    throw new Error(payload.error || "The protected design session could not start.");
  }
  return {
    csrfToken: payload.csrfToken,
    previewAvailable: Boolean(payload.previewAvailable),
  };
}

function sessionErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The protected design session could not start.";
}

export function useAiHandshake() {
  const [csrfToken, setCsrfToken] = useState("");
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (): Promise<string> => {
    setCsrfToken("");
    setError("");
    try {
      const session = await requestAiSession();
      setCsrfToken(session.csrfToken);
      setPreviewAvailable(session.previewAvailable);
      return session.csrfToken;
    } catch (reason) {
      setError(sessionErrorMessage(reason));
      throw reason;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void requestAiSession(controller.signal)
      .then((session) => {
        setCsrfToken(session.csrfToken);
        setPreviewAvailable(session.previewAvailable);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(sessionErrorMessage(reason));
      });
    return () => controller.abort();
  }, []);

  return {
    csrfToken,
    previewAvailable,
    error,
    refresh: () => refresh(),
    retry: () => void refresh().catch(() => undefined),
  };
}
