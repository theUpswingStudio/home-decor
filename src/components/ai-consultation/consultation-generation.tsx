import Image from "next/image";
import {
  BUDGET_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  type ConsultationIntake,
  type ConsultationPreviewStatus,
  type PreparedRoomAsset,
} from "@/lib/ai/consultation-types";
import styles from "./consultation-workspace.module.css";

interface ConsultationGenerationProps {
  readonly intake: ConsultationIntake;
  readonly room: PreparedRoomAsset;
  readonly roomUrl: string;
  readonly busy: boolean;
  readonly error: string;
  readonly onRetry: () => void;
  readonly onRevise: () => void;
}

interface ConsultationGenerationStatusProps {
  readonly busy: boolean;
  readonly hasResult: boolean;
  readonly previewStatus: ConsultationPreviewStatus;
  readonly error: string;
  readonly reviewing: boolean;
  readonly onReturn: () => void;
}

export function ConsultationGeneration({
  intake, room, roomUrl, busy, error, onRetry, onRevise,
}: ConsultationGenerationProps) {
  return (
    <div className={styles.generationLayout}>
      <figure className={styles.generationPhoto}>
        {roomUrl ? (
          <Image
            src={roomUrl}
            alt="Your submitted room"
            width={room.width}
            height={room.height}
            unoptimized
          />
        ) : null}
        <figcaption>{room.fileName}</figcaption>
      </figure>
      <div className={styles.generationBrief}>
        <h2>Creating your room design</h2>
        {error ? (
          <div className={styles.requestError}>
            <strong>Generation did not finish</strong>
            <p>{error}</p>
          </div>
        ) : (
          <p>We are analyzing your room and selecting catalog recommendations. Editing is unavailable until generation finishes.</p>
        )}
        <dl className={styles.paletteFacts}>
          <div><dt>Room</dt><dd>{ROOM_OPTIONS.find((option) => option.value === intake.roomId)?.label ?? intake.roomId}</dd></div>
          <div><dt>Style</dt><dd>{STYLE_OPTIONS.find((option) => option.value === intake.style)?.label ?? intake.style}</dd></div>
          <div><dt>Investment</dt><dd>{BUDGET_OPTIONS.find((option) => option.value === intake.budget)?.label ?? intake.budget}</dd></div>
        </dl>
        {error ? (
          <div className={styles.generationActions}>
            <button type="button" className={styles.textButton} disabled={busy} onClick={onRetry}>Try again</button>
            <button type="button" className={styles.textButton} disabled={busy} onClick={onRevise}>Revise brief</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConsultationGenerationStatus({
  busy, hasResult, previewStatus, error, reviewing, onReturn,
}: ConsultationGenerationStatusProps) {
  let message = "Generating your design…";
  if (!busy && hasResult) {
    switch (previewStatus) {
      case "rendering":
        message = "Your recommendations are ready. Your room preview is still generating.";
        break;
      case "ready":
        message = "Your design is ready";
        break;
      case "error":
        message = "Your preview did not finish. Your recommendations are still available.";
        break;
      case "unavailable":
        message = "Preview unavailable. Your recommendations are still available.";
        break;
      default:
        message = "Your recommendations are ready";
    }
  } else if (!busy && error) {
    message = "Generation did not finish. Your answers are unchanged.";
  }

  return (
    <div className={styles.generationStatus}>
      <p role="status" aria-label="Design generation" aria-live="polite" aria-atomic="true">{message}</p>
      {reviewing ? (
        <button type="button" className={styles.textButton} onClick={onReturn}>
          {hasResult ? "View design" : "Back to generation"}
        </button>
      ) : null}
    </div>
  );
}
