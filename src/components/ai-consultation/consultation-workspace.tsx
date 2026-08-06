"use client";

import { ArrowCounterClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  BUDGET_OPTIONS,
  DIMENSION_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  type ConsultationIntake,
  type ConsultationPreview,
  type ConsultationResult,
} from "@/lib/ai/consultation-types";
import { fetchWithAiSessionRecovery } from "@/lib/ai/client-session";
import { ConsultationIntakePanel, INTAKE_STEPS } from "./consultation-intake";
import { ConsultationResults } from "./consultation-results";
import { useAiHandshake, useConsultationSession } from "./use-consultation-session";
import styles from "./consultation-workspace.module.css";

function optionLabel(
  options: readonly { readonly value: string; readonly label: string }[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function dimensionLabel(intake: ConsultationIntake): string {
  if (intake.dimensionMode === "exact") {
    return `${intake.exactDimensions.widthFt} × ${intake.exactDimensions.lengthFt} ft`;
  }
  return DIMENSION_OPTIONS.find((option) => option.value === intake.dimensionMode)?.dimensions ?? "Not set";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The browser could not read the prepared room image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

interface ActivePreviewRequest {
  readonly id: string;
  readonly controller: AbortController;
}

export function ConsultationWorkspace() {
  const session = useConsultationSession();
  const handshake = useAiHandshake();
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const activePreview = useRef<ActivePreviewRequest | null>(null);

  useEffect(() => () => {
    activePreview.current?.controller.abort();
    activePreview.current = null;
  }, []);

  function cancelPreview() {
    activePreview.current?.controller.abort();
    activePreview.current = null;
  }

  async function renderPreview(
    result: ConsultationResult,
    productIds: readonly string[],
    attempt: 1 | 2,
  ) {
    const room = session.state.room;
    if (!room) return;

    cancelPreview();
    session.beginPreview(attempt, productIds);
    if (!handshake.previewAvailable) {
      session.failPreview(
        "unavailable",
        "Image preview is unavailable because OpenRouter is not configured.",
      );
      return;
    }

    const requestState = {
      id: crypto.randomUUID(),
      controller: new AbortController(),
    };
    activePreview.current = requestState;

    try {
      const imageDataUrl = await blobToDataUrl(room.blob);
      if (activePreview.current?.id !== requestState.id) return;
      const products = result.recommendations
        .filter((product) => productIds.includes(product.productId))
        .map(({ productId, variantId }) => ({ productId, variantId }));
      if (products.length === 0) {
        throw new Error("Choose at least one product before rendering the room.");
      }

      const response = await fetchWithAiSessionRecovery(
        "/api/ai/consultation/preview",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "x-ai-csrf": handshake.csrfToken,
          },
          body: JSON.stringify({
            imageDataUrl,
            room: {
              assetId: room.assetId,
              fileName: room.fileName,
              mediaType: room.mediaType,
              width: room.width,
              height: room.height,
            },
            intake: session.state.intake,
            products,
            attempt,
          }),
          signal: requestState.controller.signal,
        },
        { renew: handshake.refresh },
      );
      if (activePreview.current?.id !== requestState.id) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        const message = payload?.error || "The image service could not finish this preview.";
        const unavailable = response.status === 503 && /unavailable|configured/i.test(message);
        session.failPreview(unavailable ? "unavailable" : "error", message);
        return;
      }

      const blob = await response.blob();
      if (activePreview.current?.id !== requestState.id) return;
      const preview: ConsultationPreview = {
        status: "ready",
        attempt,
        blob,
        mediaType: response.headers.get("Content-Type") || blob.type || "image/png",
        model: response.headers.get("X-AI-Image-Model") || "openai/gpt-image-2",
        promptVersion: response.headers.get("X-AI-Prompt-Version") || "room-preview-v1",
        signature: response.headers.get("X-AI-Preview-Signature")
          || `${room.assetId}:${productIds.join(":")}`,
        productIds,
        createdAt: Date.now(),
        error: "",
      };
      session.completePreview(preview);
    } catch (error) {
      if (requestState.controller.signal.aborted || activePreview.current?.id !== requestState.id) return;
      session.failPreview(
        "error",
        error instanceof Error ? error.message : "The image service could not finish this preview.",
      );
    } finally {
      if (activePreview.current?.id === requestState.id) activePreview.current = null;
    }
  }

  async function analyze() {
    if (!handshake.csrfToken) {
      setRequestError(handshake.error || "The protected design session is still starting.");
      return;
    }
    const room = session.state.room;
    if (!room) {
      setRequestError("Add a room image before building recommendations.");
      session.setStep(1);
      return;
    }
    setBusy(true);
    setRequestError("");
    try {
      const response = await fetchWithAiSessionRecovery("/api/ai/consultation", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-ai-csrf": handshake.csrfToken,
        },
        body: JSON.stringify({
          action: "analyze",
          intake: session.state.intake,
          imageDataUrl: await blobToDataUrl(room.blob),
        }),
      }, { renew: handshake.refresh });
      const payload = await response.json() as ConsultationResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The room analysis could not finish.");
      session.setResult(payload);
      const initialProductIds = payload.recommendations.map((product) => product.productId);
      void renderPreview(payload, initialProductIds, 1);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "The room analysis could not finish.");
    } finally {
      setBusy(false);
    }
  }

  if (!session.ready) {
    return <div className={styles.loading} aria-busy="true">Restoring your saved design session…</div>;
  }

  const intake = session.state.intake;
  const result = session.state.result;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Design with AI</h1>
          <p>Build a room brief, review catalog recommendations, then carry an approved edit into Project Edit.</p>
        </div>
        <div className={styles.sessionActions}>
          <span>{session.persistenceError ? "Stored in memory" : "Saved in this browser for 7 days"}</span>
          <button type="button" onClick={() => { cancelPreview(); session.reset(); }}>
            <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
            Start over
          </button>
        </div>
      </header>

      <ol className={styles.timeline} aria-label="Design consultation progress">
        {INTAKE_STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const active = session.state.step === stepNumber;
          const completed = session.state.step > stepNumber;
          return (
            <li
              key={step}
              aria-label={completed ? `${step}: completed` : active ? `${step}: current step` : step}
              aria-current={active ? "step" : undefined}
              data-active={active ? "true" : undefined}
              data-completed={completed ? "true" : undefined}
            >
              <span>{completed ? <CheckIcon size={13} weight="bold" aria-hidden="true" /> : stepNumber}</span>
              {step}
            </li>
          );
        })}
      </ol>
      <p className={styles.mobileProgress}>
        Step {session.state.step} of {INTAKE_STEPS.length} · {INTAKE_STEPS[session.state.step - 1]}
      </p>

      {handshake.error ? (
        <div className={styles.handshakeError} role="alert">
          <p>{handshake.error}</p>
          <button type="button" onClick={handshake.retry}>Retry protected session</button>
        </div>
      ) : null}
      {requestError ? <p className={styles.requestError} role="alert">{requestError}</p> : null}

      {result ? (
        <ConsultationResults
          sessionId={session.state.id}
          csrfToken={handshake.csrfToken}
          refreshSession={handshake.refresh}
          intake={intake}
          result={result}
          room={session.state.room}
          roomUrl={session.roomUrl}
          preview={session.state.preview}
          previewUrl={session.previewUrl}
          selectedProductIds={session.state.selectedProductIds}
          initialMessages={session.state.messages}
          onSelectedProductIdsChange={session.setSelectedProductIds}
          onMessagesChange={session.setMessages}
          onRetryPreview={(productIds) => void renderPreview(result, productIds, 2)}
          onRevise={() => { cancelPreview(); session.reviseBrief(); }}
        />
      ) : (
        <div className={styles.intakeLayout}>
          <ConsultationIntakePanel
            session={session.state}
            roomUrl={session.roomUrl}
            busy={busy}
            onIntakeChange={session.updateIntake}
            onImageChange={session.setRoom}
            onStepChange={session.setStep}
            onAnalyze={() => void analyze()}
          />
          <aside className={styles.liveBrief} aria-labelledby="brief-title">
            <div>
              <h2 id="brief-title">Room brief</h2>
              <p>This updates as the guided intake continues.</p>
            </div>
            <dl>
              <div><dt>Room</dt><dd>{optionLabel(ROOM_OPTIONS, intake.roomId)}</dd></div>
              <div><dt>Reference</dt><dd>{session.state.room?.fileName || "Not added"}</dd></div>
              <div><dt>Size</dt><dd>{dimensionLabel(intake)}</dd></div>
              <div><dt>Style</dt><dd>{optionLabel(STYLE_OPTIONS, intake.style)}</dd></div>
              <div><dt>Use</dt><dd>{intake.priorities.map((value) => optionLabel(PRIORITY_OPTIONS, value)).join(", ")}</dd></div>
              <div><dt>Investment</dt><dd>{optionLabel(BUDGET_OPTIONS, intake.budget)}</dd></div>
            </dl>
            <div className={styles.briefNote}>
              <strong>How the recommendation works</strong>
              <p>The model reads broad room cues. Catalog rules then rank only verified Vestrel products.</p>
            </div>
            <p className={styles.disclosure}>
              The selected text provider processes analysis and chat. OpenRouter and OpenAI process image previews.
              This browser stores the room and preview for seven days. Start over clears them.
              Concept previews cannot confirm exact products or fit.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
