"use client";

import type { UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
          error: record.preview.attempt === 2
            ? "The previous image render was interrupted. Your preview retry is already used. Your recommendations are still available."
            : "The previous image render was interrupted. Use your retry to continue.",
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
  const persistenceEpoch = useRef(0);
  const persistenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (!ready || !durableRecord) return;
    const epoch = persistenceEpoch.current;
    const timer = setTimeout(() => {
      if (persistenceEpoch.current !== epoch) return;
      void storage.save(durableRecord)
        .then(() => { if (persistenceEpoch.current === epoch) setPersistenceError(false); })
        .catch(() => { if (persistenceEpoch.current === epoch) setPersistenceError(true); });
    }, 80);
    persistenceTimer.current = timer;
    return () => clearTimeout(timer);
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

  const reset = useCallback(async (): Promise<void> => {
    const epoch = ++persistenceEpoch.current;
    if (persistenceTimer.current !== null) clearTimeout(persistenceTimer.current);
    setState(createSession());
    try {
      await storage.clear();
      if (persistenceEpoch.current === epoch) setPersistenceError(false);
    } catch (reason) {
      if (persistenceEpoch.current === epoch) setPersistenceError(true);
      throw reason;
    }
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

interface ActiveSessionRefresh {
  readonly controller: AbortController;
  readonly waiters: Set<symbol>;
  readonly promise: Promise<string>;
}

export function useAiHandshake() {
  const [csrfToken, setCsrfToken] = useState("");
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const [error, setError] = useState("");

  const activeRefresh = useRef<ActiveSessionRefresh | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal): Promise<string> => {
    signal?.throwIfAborted();
    let operation = activeRefresh.current;
    if (!operation) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(
        new Error("The protected design session took too long to start. Try again."),
      ), 20_000);
      let rejectAborted: (() => void) | undefined;
      setError("");
      const pending: ActiveSessionRefresh = {
        controller,
        waiters: new Set(),
        promise: Promise.race([
          requestAiSession(controller.signal),
          new Promise<never>((_, reject) => {
            rejectAborted = () => reject(controller.signal.reason);
            controller.signal.addEventListener("abort", rejectAborted, { once: true });
          }),
        ]).then((session) => {
          controller.signal.throwIfAborted();
          if (activeRefresh.current !== pending) throw new DOMException("Abandoned session refresh", "AbortError");
          setCsrfToken(session.csrfToken);
          setPreviewAvailable(session.previewAvailable);
          return session.csrfToken;
        }).catch((reason: unknown) => {
          if (activeRefresh.current === pending) {
            setCsrfToken("");
            setError(sessionErrorMessage(reason));
          }
          throw reason;
        }).finally(() => {
          clearTimeout(timer);
          if (rejectAborted) controller.signal.removeEventListener("abort", rejectAborted);
          if (activeRefresh.current === pending) activeRefresh.current = null;
        }),
      };
      activeRefresh.current = pending;
      operation = pending;
    }

    // Chat and preview can share renewal without sharing cancellation.
    const waiter = Symbol();
    operation.waiters.add(waiter);
    let abandon: (() => void) | undefined;
    try {
      const token = signal ? await Promise.race([
        operation.promise,
        new Promise<never>((_, reject) => {
          abandon = () => reject(signal.reason);
          signal.addEventListener("abort", abandon, { once: true });
          if (signal.aborted) abandon();
        }),
      ]) : await operation.promise;
      signal?.throwIfAborted();
      return token;
    } finally {
      if (abandon) signal?.removeEventListener("abort", abandon);
      operation.waiters.delete(waiter);
      if (operation.waiters.size === 0 && activeRefresh.current === operation) {
        activeRefresh.current = null;
        operation.controller.abort();
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => { if (mounted) void refresh().catch(() => undefined); });
    return () => {
      mounted = false;
      const operation = activeRefresh.current;
      activeRefresh.current = null;
      operation?.controller.abort();
    };
  }, [refresh]);

  return {
    csrfToken,
    previewAvailable,
    error,
    refresh,
    retry: () => void refresh().catch(() => undefined),
  };
}
