"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileImageIcon,
  SparkleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import {
  BUDGET_OPTIONS,
  DIMENSION_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  type ConsultationIntake,
  type ConsultationPriority,
  type DimensionMode,
} from "@/lib/ai/consultation-types";
import {
  prepareRoomImage,
  type ConsultationSessionState,
} from "./use-consultation-session";
import styles from "./consultation-workspace.module.css";

export const INTAKE_STEPS = [
  "Room and reference",
  "Set room size",
  "Style and priorities",
  "Set investment",
  "Discuss the edit",
] as const;

interface ConsultationIntakeProps {
  readonly session: ConsultationSessionState;
  readonly busy: boolean;
  readonly onIntakeChange: (patch: Partial<ConsultationIntake>) => void;
  readonly onImageChange: (imageDataUrl: string, fileName: string) => void;
  readonly onStepChange: (step: number) => void;
  readonly onAnalyze: () => void;
}

function AssistantQuestion({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className={styles.question}>
      <div className={styles.assistantMark} aria-hidden="true">
        <SparkleIcon size={18} weight="fill" />
      </div>
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function OptionRows({ children }: { readonly children: React.ReactNode }) {
  return <div className={styles.optionRows}>{children}</div>;
}

function StepOne({
  session,
  onIntakeChange,
  onImageChange,
}: Pick<ConsultationIntakeProps, "session" | "onIntakeChange" | "onImageChange">) {
  const [imageError, setImageError] = useState("");
  const [preparing, setPreparing] = useState(false);

  async function chooseImage(file: File | undefined) {
    if (!file) return;
    setPreparing(true);
    setImageError("");
    try {
      onImageChange(await prepareRoomImage(file), file.name);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "The image could not be prepared.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      <AssistantQuestion title="Which room are we working on?">
        <p>Choose the room type, then add one clear photo or floor-plan image.</p>
        <OptionRows>
          {ROOM_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={session.intake.roomId === option.value}
              data-selected={session.intake.roomId === option.value ? "true" : undefined}
              onClick={() => onIntakeChange({ roomId: option.value })}
            >
              <span>{option.label}</span>
              <span>{session.intake.roomId === option.value ? "Selected" : "Choose"}</span>
            </button>
          ))}
        </OptionRows>
      </AssistantQuestion>

      <div className={styles.uploadSection}>
        {session.imageDataUrl ? (
          <div className={styles.uploadPreview}>
            <Image
              src={session.imageDataUrl}
              alt="Uploaded room reference"
              width={1_600}
              height={1_000}
              sizes="(max-width: 64rem) 100vw, 58vw"
              unoptimized
            />
            <div><FileImageIcon size={18} aria-hidden="true" />{session.fileName}</div>
          </div>
        ) : null}
        <label className={styles.uploadControl}>
          <UploadSimpleIcon size={20} aria-hidden="true" />
          <span>
            <strong>{preparing ? "Preparing image…" : session.imageDataUrl ? "Replace room image" : "Choose room image"}</strong>
            <span>JPEG, PNG, or WebP · 8 MB maximum</span>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={preparing}
            onChange={(event) => void chooseImage(event.currentTarget.files?.[0])}
          />
        </label>
        <p className={styles.fieldError} role="status">{imageError}</p>
      </div>
    </>
  );
}

function StepTwo({
  intake,
  onIntakeChange,
}: {
  readonly intake: ConsultationIntake;
  readonly onIntakeChange: ConsultationIntakeProps["onIntakeChange"];
}) {
  function updateExact(key: keyof ConsultationIntake["exactDimensions"], value: number) {
    if (!Number.isFinite(value)) return;
    onIntakeChange({ exactDimensions: { ...intake.exactDimensions, [key]: value } });
  }

  return (
    <AssistantQuestion title="What dimensions should I use?">
      <p>Exact measurements improve fit checks. An assumption keeps this first conversation moving.</p>
      <OptionRows>
        {DIMENSION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={intake.dimensionMode === option.value}
            data-selected={intake.dimensionMode === option.value ? "true" : undefined}
            onClick={() => onIntakeChange({ dimensionMode: option.value })}
          >
            <span>
              <strong>{option.label}</strong>
              <span>{option.value === "small" ? "Compact" : option.value === "medium" ? "Balanced" : "Open"} planning scenario</span>
            </span>
            <span>{option.dimensions}</span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={intake.dimensionMode === "exact"}
          data-selected={intake.dimensionMode === "exact" ? "true" : undefined}
          onClick={() => onIntakeChange({ dimensionMode: "exact" as DimensionMode })}
        >
          <span>
            <strong>Measured</strong>
            <span>Use your room measurements</span>
          </span>
          <span>Enter size</span>
        </button>
      </OptionRows>
      {intake.dimensionMode === "exact" ? (
        <div className={styles.measurements}>
          {([
            ["widthFt", "Width"],
            ["lengthFt", "Length"],
            ["ceilingFt", "Ceiling"],
          ] as const).map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <span>
                <input
                  type="number"
                  min={key === "ceilingFt" ? 6 : 5}
                  max={key === "ceilingFt" ? 30 : 80}
                  step="0.5"
                  value={intake.exactDimensions[key]}
                  onChange={(event) => updateExact(key, event.currentTarget.valueAsNumber)}
                />
                ft
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </AssistantQuestion>
  );
}

function StepThree({
  intake,
  onIntakeChange,
}: {
  readonly intake: ConsultationIntake;
  readonly onIntakeChange: ConsultationIntakeProps["onIntakeChange"];
}) {
  function togglePriority(priority: ConsultationPriority) {
    const selected = intake.priorities.includes(priority);
    const priorities = selected
      ? intake.priorities.filter((value) => value !== priority)
      : [...intake.priorities, priority];
    if (priorities.length > 0) onIntakeChange({ priorities });
  }

  const priorityLimitReached = intake.priorities.length >= 4;

  return (
    <AssistantQuestion title="How should the room feel and work?">
      <p>Choose one visual direction and up to four practical priorities.</p>
      <fieldset className={styles.choiceGroup}>
        <legend>Visual direction</legend>
        <div className={styles.selectionGrid}>
          {STYLE_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="consultation-style"
                checked={intake.style === option.value}
                onChange={() => onIntakeChange({ style: option.value })}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.choiceGroup}>
        <legend>Room priorities</legend>
        <div className={styles.selectionGrid}>
          {PRIORITY_OPTIONS.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={intake.priorities.includes(option.value)}
                disabled={priorityLimitReached && !intake.priorities.includes(option.value)}
                aria-describedby="priority-selection-status"
                onChange={() => togglePriority(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p id="priority-selection-status" className={styles.choiceStatus} aria-live="polite">
          {intake.priorities.length} of 4 priorities selected
          {priorityLimitReached ? ". Remove one to choose another." : "."}
        </p>
      </fieldset>
    </AssistantQuestion>
  );
}

function StepFour({
  intake,
  onIntakeChange,
}: {
  readonly intake: ConsultationIntake;
  readonly onIntakeChange: ConsultationIntakeProps["onIntakeChange"];
}) {
  return (
    <AssistantQuestion title="What investment range should guide the edit?">
      <p>The range helps balance anchor pieces with supporting furniture.</p>
      <OptionRows>
        {BUDGET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={intake.budget === option.value}
            data-selected={intake.budget === option.value ? "true" : undefined}
            onClick={() => onIntakeChange({ budget: option.value })}
          >
            <span>{option.label}</span>
            <span>{intake.budget === option.value ? "Selected" : "Choose"}</span>
          </button>
        ))}
      </OptionRows>
      <label className={styles.notesField}>
        <span>Anything to keep, avoid, or plan around?</span>
        <textarea
          rows={4}
          maxLength={600}
          value={intake.notes}
          placeholder="For example: keep the oak media cabinet and leave a clear path to the balcony."
          onChange={(event) => onIntakeChange({ notes: event.currentTarget.value })}
        />
      </label>
    </AssistantQuestion>
  );
}

export function ConsultationIntakePanel({
  session,
  busy,
  onIntakeChange,
  onImageChange,
  onStepChange,
  onAnalyze,
}: ConsultationIntakeProps) {
  const canContinue = session.step !== 1 || Boolean(session.imageDataUrl);
  return (
    <section className={styles.intakePanel} aria-label="Guided room intake">
      {session.step === 1 ? (
        <StepOne
          session={session}
          onIntakeChange={onIntakeChange}
          onImageChange={onImageChange}
        />
      ) : null}
      {session.step === 2 ? <StepTwo intake={session.intake} onIntakeChange={onIntakeChange} /> : null}
      {session.step === 3 ? <StepThree intake={session.intake} onIntakeChange={onIntakeChange} /> : null}
      {session.step === 4 ? <StepFour intake={session.intake} onIntakeChange={onIntakeChange} /> : null}

      <div className={styles.stepActions}>
        {session.step > 1 ? (
          <button type="button" className={styles.secondaryButton} onClick={() => onStepChange(session.step - 1)}>
            <ArrowLeftIcon size={18} aria-hidden="true" />
            Back
          </button>
        ) : <span />}
        {session.step < 4 ? (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canContinue}
            onClick={() => onStepChange(session.step + 1)}
          >
            Continue
            <ArrowRightIcon size={18} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className={styles.primaryButton} disabled={busy} onClick={onAnalyze}>
            {busy ? "Analyzing room…" : "Build recommendations"}
            <SparkleIcon size={18} weight="fill" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
