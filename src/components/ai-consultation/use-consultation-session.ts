"use client";

import type { UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_CONSULTATION_INTAKE,
  type ConsultationIntake,
  type ConsultationResult,
} from "@/lib/ai/consultation-types";

const SESSION_STORAGE_KEY = "vestrel-house:ai-consultation:v2";
const SESSION_VERSION = 2 as const;
const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1_600;

export interface ConsultationSessionState {
  readonly version: typeof SESSION_VERSION;
  readonly id: string;
  readonly step: number;
  readonly intake: ConsultationIntake;
  readonly imageDataUrl: string;
  readonly fileName: string;
  readonly result: ConsultationResult | null;
  readonly selectedProductIds: readonly string[];
  readonly messages: readonly UIMessage[];
}

function createSession(): ConsultationSessionState {
  return {
    version: SESSION_VERSION,
    id: crypto.randomUUID(),
    step: 1,
    intake: DEFAULT_CONSULTATION_INTAKE,
    imageDataUrl: "",
    fileName: "",
    result: null,
    selectedProductIds: [],
    messages: [],
  };
}

function loadSession(): ConsultationSessionState | null {
  try {
    const serialized = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!serialized) return null;
    const value: unknown = JSON.parse(serialized);
    if (
      typeof value !== "object"
      || value === null
      || !("version" in value)
      || value.version !== SESSION_VERSION
      || !("id" in value)
      || typeof value.id !== "string"
      || !("intake" in value)
      || typeof value.intake !== "object"
      || value.intake === null
    ) {
      return null;
    }
    return value as ConsultationSessionState;
  } catch {
    return null;
  }
}

function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not prepare this image."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("The browser could not read the prepared image."));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    }, "image/jpeg", 0.84);
  });
}

export async function prepareRoomImage(file: File): Promise<string> {
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
    return await canvasToDataUrl(canvas);
  } finally {
    bitmap.close();
  }
}

export function useConsultationSession() {
  const [state, setState] = useState<ConsultationSessionState>(() => createSession());
  const [ready, setReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setState(loadSession() ?? createSession());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
      if (persistenceError) queueMicrotask(() => setPersistenceError(false));
    } catch {
      if (!persistenceError) queueMicrotask(() => setPersistenceError(true));
    }
  }, [persistenceError, ready, state]);

  const updateIntake = useCallback((patch: Partial<ConsultationIntake>) => {
    setState((current) => ({
      ...current,
      intake: { ...current.intake, ...patch },
      result: null,
      selectedProductIds: [],
      messages: [],
    }));
  }, []);

  const setImage = useCallback((imageDataUrl: string, fileName: string) => {
    setState((current) => ({
      ...current,
      imageDataUrl,
      fileName,
      result: null,
      selectedProductIds: [],
      messages: [],
    }));
  }, []);

  const setStep = useCallback((step: number) => {
    setState((current) => ({ ...current, step: Math.min(5, Math.max(1, step)) }));
  }, []);

  const setResult = useCallback((result: ConsultationResult) => {
    setState((current) => ({
      ...current,
      step: 5,
      result,
      selectedProductIds: result.recommendations.map((product) => product.productId),
    }));
  }, []);

  const reviseBrief = useCallback(() => {
    setState((current) => ({
      ...current,
      step: 4,
      result: null,
      selectedProductIds: [],
      messages: [],
    }));
  }, []);

  const setSelectedProductIds = useCallback((selectedProductIds: readonly string[]) => {
    setState((current) => ({ ...current, selectedProductIds }));
  }, []);

  const setMessages = useCallback((messages: readonly UIMessage[]) => {
    setState((current) => ({ ...current, messages }));
  }, []);

  const reset = useCallback(() => {
    setState(createSession());
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      setPersistenceError(true);
    }
  }, []);

  return {
    state,
    ready,
    persistenceError,
    updateIntake,
    setImage,
    setStep,
    setResult,
    reviseBrief,
    setSelectedProductIds,
    setMessages,
    reset,
  };
}

async function requestAiSession(signal?: AbortSignal): Promise<string> {
  const response = await fetch("/api/ai/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal,
  });
  const payload = await response.json() as { csrfToken?: string; error?: string };
  if (!response.ok || !payload.csrfToken) {
    throw new Error(payload.error || "The protected design session could not start.");
  }
  return payload.csrfToken;
}

function sessionErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The protected design session could not start.";
}

export function useAiHandshake() {
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async (): Promise<string> => {
    setCsrfToken("");
    setError("");
    try {
      const token = await requestAiSession();
      setCsrfToken(token);
      return token;
    } catch (reason) {
      setError(sessionErrorMessage(reason));
      throw reason;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void requestAiSession(controller.signal)
      .then(setCsrfToken)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(sessionErrorMessage(reason));
      });
    return () => controller.abort();
  }, []);

  return {
    csrfToken,
    error,
    refresh: () => refresh(),
    retry: () => void refresh().catch(() => undefined),
  };
}
