import Image from "next/image";
import {
  BUDGET_OPTIONS,
  DIMENSION_OPTIONS,
  PRIORITY_OPTIONS,
  ROOM_OPTIONS,
  STYLE_OPTIONS,
  type ConsultationIntake,
  type PreparedRoomAsset,
} from "@/lib/ai/consultation-types";
import { INTAKE_STEPS } from "./consultation-intake";
import styles from "./consultation-workspace.module.css";

export type ReviewStep = 1 | 2 | 3 | 4;

interface ConsultationAnswerReviewProps {
  readonly step: ReviewStep;
  readonly intake: ConsultationIntake;
  readonly room: PreparedRoomAsset;
  readonly roomUrl: string;
  readonly generationActive: boolean;
  readonly onRevise: () => void;
}

export function ConsultationAnswerReview({
  step, intake, room, roomUrl, generationActive, onRevise,
}: ConsultationAnswerReviewProps) {
  const preset = DIMENSION_OPTIONS.find((option) => option.value === intake.dimensionMode);

  return (
    <>
      <h2 tabIndex={-1}>{INTAKE_STEPS[step - 1]}</h2>
      <p id="answer-review-editing" className={styles.reviewNotice}>
        {generationActive
          ? "You can review your answers while we generate your design. Editing is unavailable until generation finishes."
          : "These are your submitted answers. Choose Revise brief to make changes."}
      </p>
      <div className={step === 1 ? styles.reviewRoom : undefined}>
        <dl className={styles.reviewAnswers}>
          {step === 1 ? (
            <>
              <div><dt>Room</dt><dd>{ROOM_OPTIONS.find((option) => option.value === intake.roomId)?.label ?? intake.roomId}</dd></div>
              <div><dt>Reference</dt><dd>{room.fileName}</dd></div>
            </>
          ) : null}
          {step === 2 ? intake.dimensionMode === "exact" ? (
            <>
              <div><dt>Size</dt><dd>Measured</dd></div>
              <div><dt>Width</dt><dd>{intake.exactDimensions.widthFt} ft</dd></div>
              <div><dt>Length</dt><dd>{intake.exactDimensions.lengthFt} ft</dd></div>
              <div><dt>Ceiling</dt><dd>{intake.exactDimensions.ceilingFt} ft</dd></div>
            </>
          ) : (
            <>
              <div><dt>Size</dt><dd>{preset?.label} (assumed)</dd></div>
              <div><dt>Dimensions</dt><dd>{preset?.dimensions}</dd></div>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <div><dt>Style</dt><dd>{STYLE_OPTIONS.find((option) => option.value === intake.style)?.label ?? intake.style}</dd></div>
              <div>
                <dt>Priorities</dt>
                <dd>{intake.priorities.map((value) => PRIORITY_OPTIONS.find((option) => option.value === value)?.label ?? value).join(", ")}</dd>
              </div>
            </>
          ) : null}
          {step === 4 ? (
            <>
              <div><dt>Investment</dt><dd>{BUDGET_OPTIONS.find((option) => option.value === intake.budget)?.label ?? intake.budget}</dd></div>
              <div><dt>Additional notes</dt><dd className={styles.reviewNotes}>{intake.notes || "No additional notes"}</dd></div>
            </>
          ) : null}
        </dl>
        {step === 1 && roomUrl ? (
          <div className={styles.generationPhoto}>
            <Image
              src={roomUrl}
              alt="Your submitted room"
              width={room.width}
              height={room.height}
              unoptimized
            />
          </div>
        ) : null}
      </div>
      <div className={styles.generationActions}>
        <button
          type="button"
          className={styles.textButton}
          disabled={generationActive}
          aria-describedby="answer-review-editing"
          onClick={onRevise}
        >
          Revise brief
        </button>
      </div>
    </>
  );
}
