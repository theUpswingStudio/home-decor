"use client";

import { ArrowCounterClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUDGET_OPTIONS,
  DIMENSION_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  type ConsultationIntake,
  type ConsultationPreview,
  type ConsultationResult,
  type PreparedRoomAsset,
} from "@/lib/ai/consultation-types";
import { fetchWithAiSessionRecovery } from "@/lib/ai/client-session";
import { ConsultationIntakePanel, INTAKE_STEPS } from "./consultation-intake";
import { ConsultationResults } from "./consultation-results";
import { ConsultationAnswerReview, type ReviewStep } from "./consultation-answer-review";
import { ConsultationResetDialog } from "./consultation-reset-dialog";
import { ConsultationGeneration, ConsultationGenerationStatus } from "./consultation-generation";
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
  timer?: ReturnType<typeof setTimeout>;
}

export function ConsultationWorkspace() {
  const session = useConsultationSession();
  const handshake = useAiHandshake();
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [generationStarted, setGenerationStarted] = useState(false);
  const [reviewStep, setReviewStep] = useState<ReviewStep | null>(null);
  const [resetDialog, setResetDialog] = useState({ open: false, activeWork: false });
  const [resetStatus, setResetStatus] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const sessionEpoch = useRef(0);
  const [callbackEpoch, setCallbackEpoch] = useState(0);
  const startOverRef = useRef<HTMLButtonElement>(null);
  const intakeRef = useRef<HTMLDivElement>(null);
  const pendingIntakeFocus = useRef(false);
  const resetPending = useRef(false);
  const handleChatBusyChange = useCallback((value: boolean) => {
    if (sessionEpoch.current === callbackEpoch) setChatBusy(value);
  }, [callbackEpoch]);
  const { setMessages, setRoom } = session;
  const handleMessagesChange = useCallback((messages: readonly UIMessage[]) => {
    if (sessionEpoch.current === callbackEpoch) setMessages(messages);
  }, [callbackEpoch, setMessages]);
  const handleRoomChange = useCallback((room: PreparedRoomAsset) => {
    if (sessionEpoch.current === callbackEpoch) setRoom(room);
  }, [callbackEpoch, setRoom]);
  const activeAnalysis = useRef<ActivePreviewRequest | null>(null);
  const activePreview = useRef<ActivePreviewRequest | null>(null);
  const designPanelRef = useRef<HTMLElement>(null);
  const reviewPanelRef = useRef<HTMLElement>(null);
  const pendingFocus = useRef<"design" | "review" | null>(null);
  const generationActive = busy || session.state.preview.status === "rendering";

  useEffect(() => () => {
    const analysis = activeAnalysis.current;
    const preview = activePreview.current;
    activeAnalysis.current = null;
    activePreview.current = null;
    clearTimeout(analysis?.timer);
    clearTimeout(preview?.timer);
    analysis?.controller.abort();
    preview?.controller.abort();
  }, []);

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const element = target === "design"
      ? designPanelRef.current
      : reviewPanelRef.current?.querySelector<HTMLElement>("h2");
    if (!element) return;
    pendingFocus.current = null;
    element.focus();
  }, [reviewStep, generationStarted]);

  useEffect(() => {
    if (!pendingIntakeFocus.current) return;
    const heading = intakeRef.current?.querySelector("h2");
    if (heading) {
      pendingIntakeFocus.current = false;
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [session.state.id]);

  function cancelPreview() {
    const request = activePreview.current;
    activePreview.current = null;
    clearTimeout(request?.timer);
    request?.controller.abort();
  }

  function confirmReset() {
    if (resetPending.current) return;
    resetPending.current = true;
    sessionEpoch.current += 1;
    const epoch = sessionEpoch.current;
    setCallbackEpoch(epoch);
    const request = activeAnalysis.current;
    activeAnalysis.current = null;
    clearTimeout(request?.timer);
    request?.controller.abort();
    cancelPreview();
    pendingFocus.current = null;
    setReviewStep(null);
    pendingIntakeFocus.current = true;
    setResetDialog({ open: false, activeWork: false });
    setChatBusy(false);
    setBusy(false);
    setGenerationStarted(false);
    setRequestError("");
    setResetStatus("Clearing saved design…");
    // resetPending serializes clearing; revising a new draft must not hide its outcome.
    void session.reset().then(() => {
      setResetStatus("");
    }).catch(() => {
      setResetStatus("The design was cleared from this page, but saved data could not be removed.");
    }).finally(() => { resetPending.current = false; });
  }

  function startOver() {
    if (resetPending.current) return;
    if (session.state.room || session.state.result || generationActive || chatBusy) {
      setResetDialog({ open: true, activeWork: generationActive || chatBusy });
    } else confirmReset();
  }

  function dismissReset() {
    setResetDialog({ open: false, activeWork: false });
    requestAnimationFrame(() => startOverRef.current?.focus());
  }

  function reviseBrief() {
    if (generationActive || activeAnalysis.current) return;
    sessionEpoch.current += 1;
    setCallbackEpoch(sessionEpoch.current);
    setChatBusy(false);
    cancelPreview();
    pendingFocus.current = null;
    setReviewStep(null);
    setGenerationStarted(false);
    setRequestError("");
    session.reviseBrief();
  }

  function openReview(step: ReviewStep) {
    if (reviewStep === step) {
      reviewPanelRef.current?.querySelector<HTMLElement>("h2")?.focus();
      return;
    }
    pendingFocus.current = "review";
    setReviewStep(step);
  }

  function returnToDesign() {
    pendingFocus.current = "design";
    setReviewStep(null);
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

    const requestState: ActivePreviewRequest = {
      id: crypto.randomUUID(),
      controller: new AbortController(),
    };
    activePreview.current = requestState;
    requestState.timer = setTimeout(() => {
      if (activePreview.current !== requestState) return;
      activePreview.current = null;
      requestState.controller.abort();
      session.failPreview("error", "The preview took too long to finish. Your recommendations are still available.");
    }, 210_000);

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
        if (activePreview.current !== requestState || requestState.controller.signal.aborted) return;
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
      clearTimeout(requestState.timer);
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
    if (activeAnalysis.current || session.state.preview.status === "rendering") return;
    const requestState: ActivePreviewRequest = { id: crypto.randomUUID(), controller: new AbortController() };
    const submittedIntake = session.state.intake;
    activeAnalysis.current = requestState;
    requestState.timer = setTimeout(() => {
      if (activeAnalysis.current !== requestState) return;
      activeAnalysis.current = null;
      requestState.controller.abort();
      setBusy(false);
      setRequestError("The room analysis took too long. Your answers are still available.");
    }, 120_000);
    if (generationStarted && reviewStep === null) designPanelRef.current?.focus();
    else pendingFocus.current = "design";
    setGenerationStarted(true);
    setReviewStep(null);
    setBusy(true);
    setRequestError("");
    try {
      const imageDataUrl = await blobToDataUrl(room.blob);
      if (activeAnalysis.current?.id !== requestState.id) return;
      const response = await fetchWithAiSessionRecovery("/api/ai/consultation", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-ai-csrf": handshake.csrfToken,
        },
        body: JSON.stringify({
          action: "analyze",
          intake: submittedIntake,
          imageDataUrl,
        }),
        signal: requestState.controller.signal,
      }, { renew: handshake.refresh });
      const payload = await response.json() as ConsultationResult & { error?: string };
      if (activeAnalysis.current?.id !== requestState.id || requestState.controller.signal.aborted) return;
      if (!response.ok) throw new Error(payload.error || "The room analysis could not finish.");
      session.setResult(payload);
      const initialProductIds = payload.recommendations.map((product) => product.productId);
      void renderPreview(payload, initialProductIds, 1);
    } catch (error) {
      if (activeAnalysis.current?.id !== requestState.id || requestState.controller.signal.aborted) return;
      setRequestError(error instanceof Error ? error.message : "The room analysis could not finish.");
    } finally {
      clearTimeout(requestState.timer);
      if (activeAnalysis.current?.id === requestState.id) {
        activeAnalysis.current = null;
        setBusy(false);
      }
    }
  }

  if (!session.ready) {
    return <div className={styles.loading} aria-busy="true">Restoring your saved design session…</div>;
  }

  const intake = session.state.intake;
  const result = session.state.result;
  const hasDesignWorkspace = generationStarted || Boolean(result);
  const handshakeFeedback = handshake.error ? (
    <div className={styles.handshakeError} role="alert">
      <p>{handshake.error}</p>
      <button type="button" onClick={handshake.retry}>Retry protected session</button>
    </div>
  ) : null;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Design with AI</h1>
          <p>Build a room brief, review catalog recommendations, then carry an approved edit into Project Edit.</p>
        </div>
        <div className={styles.sessionActions}>
          <span>{session.persistenceError ? "Stored in memory" : "Saved in this browser for 7 days"}</span>
          <button ref={startOverRef} type="button" onClick={startOver}>
            <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
            Start over
          </button>
        </div>
      </header>

      <ConsultationResetDialog
        open={resetDialog.open}
        activeWork={resetDialog.activeWork}
        onDismiss={dismissReset}
        onConfirm={confirmReset}
      />
      {resetStatus ? <p className={styles.requestError} role="status">{resetStatus}</p> : null}

      {hasDesignWorkspace ? (
        <nav className={styles.reviewNavigation} aria-label="Review completed answers">
          {INTAKE_STEPS.slice(0, 4).map((label, index) => {
            const step = (index + 1) as ReviewStep;
            return (
              <button
                key={label}
                type="button"
                aria-current={reviewStep === step ? "step" : undefined}
                onClick={() => openReview(step)}
              >
                <CheckIcon size={16} weight="bold" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
      ) : (
        <>
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
        </>
      )}

      {!hasDesignWorkspace ? handshakeFeedback : null}
      {requestError && !hasDesignWorkspace ? <p className={styles.requestError} role="alert">{requestError}</p> : null}

      {hasDesignWorkspace ? (
        <>
          <ConsultationGenerationStatus
            busy={busy}
            hasResult={Boolean(result)}
            previewStatus={session.state.preview.status}
            error={requestError}
            reviewing={reviewStep !== null}
            onReturn={returnToDesign}
          />
          <section ref={designPanelRef} className={styles.designPanel} tabIndex={-1} aria-label="Design workspace" hidden={reviewStep !== null}>
            {handshakeFeedback}
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
                onMessagesChange={handleMessagesChange}
                briefLocked={generationActive}
                onChatBusyChange={handleChatBusyChange}
                onRetryPreview={(productIds) => void renderPreview(result, productIds, 2)}
                onRevise={reviseBrief}
              />
            ) : session.state.room ? (
              <ConsultationGeneration
                intake={intake}
                room={session.state.room}
                roomUrl={session.roomUrl}
                busy={busy}
                error={requestError}
                onRetry={() => void analyze()}
                onRevise={reviseBrief}
              />
            ) : null}
          </section>
          {reviewStep !== null && session.state.room ? (
            <section ref={reviewPanelRef} className={styles.answerReview} aria-label="Submitted answers">
              <ConsultationAnswerReview
                step={reviewStep}
                intake={intake}
                room={session.state.room}
                roomUrl={session.roomUrl}
                generationActive={generationActive}
                onRevise={reviseBrief}
              />
            </section>
          ) : null}
        </>
      ) : (
        <div ref={intakeRef} className={styles.intakeLayout}>
          <ConsultationIntakePanel
            session={session.state}
            roomUrl={session.roomUrl}
            busy={busy}
            onIntakeChange={session.updateIntake}
            onImageChange={handleRoomChange}
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
