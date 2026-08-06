"use client";

import { ArrowCounterClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  BUDGET_OPTIONS,
  DIMENSION_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  type ConsultationIntake,
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

export function ConsultationWorkspace() {
  const session = useConsultationSession();
  const handshake = useAiHandshake();
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState("");

  async function analyze() {
    if (!handshake.csrfToken) {
      setRequestError(handshake.error || "The protected design session is still starting.");
      return;
    }
    if (!session.state.imageDataUrl) {
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
          imageDataUrl: session.state.imageDataUrl,
        }),
      }, { renew: handshake.refresh });
      const payload = await response.json() as ConsultationResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The room analysis could not finish.");
      session.setResult(payload);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "The room analysis could not finish.");
    } finally {
      setBusy(false);
    }
  }

  if (!session.ready) {
    return <div className={styles.loading} aria-busy="true">Restoring this tab’s design session…</div>;
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
          <span>{session.persistenceError ? "Stored in memory" : "Saved in this tab"}</span>
          <button type="button" onClick={session.reset}>
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
          selectedProductIds={session.state.selectedProductIds}
          initialMessages={session.state.messages}
          onSelectedProductIdsChange={session.setSelectedProductIds}
          onMessagesChange={session.setMessages}
          onRevise={session.reviseBrief}
        />
      ) : (
        <div className={styles.intakeLayout}>
          <ConsultationIntakePanel
            session={session.state}
            busy={busy}
            onIntakeChange={session.updateIntake}
            onImageChange={session.setImage}
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
              <div><dt>Reference</dt><dd>{session.state.fileName || "Not added"}</dd></div>
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
              The room image stays in this browser tab. It goes to the selected model only when analysis starts.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
