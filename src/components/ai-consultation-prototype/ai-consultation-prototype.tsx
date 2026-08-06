"use client";

/**
 * PROTOTYPE — throwaway code.
 * Three AI consultation structures, switchable with ?variant=A|B|C on
 * /prototype/ai-consultation. State stays in memory for visual comparison.
 */

import {
  ArrowRightIcon,
  CheckIcon,
  ChatCircleDotsIcon,
  FileImageIcon,
  PaperPlaneTiltIcon,
  RulerIcon,
  SparkleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PrototypeSwitcher } from "@/components/prototype/prototype-switcher";
import styles from "./ai-consultation-prototype.module.css";

interface FixtureImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

interface PrototypeProduct {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly finish: string;
  readonly dimensions: string;
  readonly image: FixtureImage;
}

export interface ConsultationPrototypeFixture {
  readonly room: {
    readonly name: string;
    readonly image: FixtureImage;
  };
  readonly products: readonly PrototypeProduct[];
}

type DimensionMode = "measured" | "small" | "medium" | "large";

interface PrototypeState {
  readonly phase: "intake" | "active";
  readonly intakeStep: number;
  readonly dimensionMode: DimensionMode;
  readonly fileName: string;
  readonly message: string;
  readonly setIntakeStep: (value: number) => void;
  readonly setDimensionMode: (value: DimensionMode) => void;
  readonly setFileName: (value: string) => void;
  readonly setMessage: (value: string) => void;
  readonly setPhase: (value: "intake" | "active") => void;
}

const VARIANTS = [
  { key: "A", label: "Planning table" },
  { key: "B", label: "Room canvas" },
  { key: "C", label: "Guided conversation" },
] as const;

const INTAKE_STEPS = [
  "Room & reference",
  "Set room size",
  "Style & priorities",
  "Set investment",
  "Review brief",
] as const;

const DIMENSION_OPTIONS: readonly {
  key: DimensionMode;
  label: string;
  value: string;
  note: string;
}[] = [
  { key: "measured", label: "Measured", value: "Enter exact size", note: "Best for final fit checks" },
  { key: "small", label: "Small", value: "10 × 12 ft", note: "Compact planning scenario" },
  { key: "medium", label: "Medium", value: "14 × 18 ft", note: "Balanced planning scenario" },
  { key: "large", label: "Large", value: "18 × 24 ft", note: "Open planning scenario" },
];

function activeDimensions(mode: DimensionMode) {
  return DIMENSION_OPTIONS.find((option) => option.key === mode) ?? DIMENSION_OPTIONS[2];
}

function UploadControl({ fileName, setFileName }: Pick<PrototypeState, "fileName" | "setFileName">) {
  return (
    <label className={styles.uploadControl}>
      <UploadSimpleIcon size={20} aria-hidden="true" />
      <span>
        <strong>{fileName ? "Replace room file" : "Choose a room file"}</strong>
        <small>{fileName || "JPG, PNG, HEIC, or PDF"}</small>
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/heic,application/pdf"
        onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
      />
    </label>
  );
}

function DimensionChoices({
  dimensionMode,
  setDimensionMode,
}: Pick<PrototypeState, "dimensionMode" | "setDimensionMode">) {
  return (
    <fieldset className={styles.dimensionChoices}>
      <legend>How should we size this room?</legend>
      <div>
        {DIMENSION_OPTIONS.map((option) => (
          <label key={option.key} className={styles.dimensionOption}>
            <input
              type="radio"
              name="room-dimensions"
              value={option.key}
              checked={dimensionMode === option.key}
              onChange={() => setDimensionMode(option.key)}
            />
            <span>
              <strong>{option.label}</strong>
              <span>{option.value}</span>
              <small>{option.note}</small>
            </span>
          </label>
        ))}
      </div>
      {dimensionMode === "measured" ? (
        <div className={styles.measureFields}>
          <label>
            Width
            <span><input inputMode="decimal" defaultValue="14" /> ft</span>
          </label>
          <label>
            Length
            <span><input inputMode="decimal" defaultValue="18" /> ft</span>
          </label>
          <label>
            Ceiling
            <span><input inputMode="decimal" defaultValue="9" /> ft</span>
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}

function SessionDisclosure() {
  return (
    <p className={styles.disclosure}>
      Portfolio demonstration. The shown catalog images represent these fictional products.
      Assumed dimensions support planning only.
    </p>
  );
}

function ProductStrip({ products }: { readonly products: readonly PrototypeProduct[] }) {
  return (
    <ul className={styles.productStrip}>
      {products.map((product, index) => (
        <li key={product.id}>
          <Image
            src={product.image.url}
            alt={product.image.alt}
            width={product.image.width}
            height={product.image.height}
            sizes="(max-width: 48rem) 8rem, 11rem"
          />
          <div>
            <p>{index === 0 ? "Anchor candidate" : "Supporting candidate"}</p>
            <h3>{product.name}</h3>
            <span>{product.finish}</span>
            <strong>{product.price}</strong>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ResumeBanner({ state }: { state: PrototypeState }) {
  return (
    <aside className={styles.resumeBanner} aria-label="Saved design session">
      <div>
        <strong>Resume living room</strong>
        <span>Step 2 of 5 · 14 × 18 ft · room photo attached</span>
      </div>
      <button type="button" onClick={() => state.setPhase("active")}>
        Resume Design Session
        <ArrowRightIcon size={17} weight="bold" aria-hidden="true" />
      </button>
    </aside>
  );
}

function ActiveSessionPreview({
  fixture,
  state,
}: {
  fixture: ConsultationPrototypeFixture;
  state: PrototypeState;
}) {
  return (
    <section className={styles.activeSession} aria-labelledby="active-session-title">
      <header>
        <div>
          <h1 id="active-session-title">Living room Design Session</h1>
          <p>Session restored · Room photo · 14 × 18 ft · $15,000–$35,000</p>
        </div>
        <button type="button" className={styles.secondaryAction} onClick={() => state.setPhase("intake")}>
          Back to intake
        </button>
      </header>
      <div className={styles.activeSessionLayout}>
        <div className={styles.activeRoom}>
          <Image
            src={fixture.room.image.url}
            alt="Restored living room reference for the active design session"
            fill
            priority
            sizes="(max-width: 64rem) 100vw, 58vw"
          />
          <p>Restored room reference</p>
        </div>
        <div className={styles.activeConversation}>
          <div className={styles.assistantHeading}>
            <SparkleIcon size={20} weight="fill" aria-hidden="true" />
            <div>
              <h2>Vestrel design assistant</h2>
              <p>Brief complete</p>
            </div>
          </div>
          <article>
            <p>
              I restored your room photo, medium planning size, collected-modern style,
              reading priority, and investment range.
            </p>
            <p>
              These three pieces create a calm center. The sofa anchors the long wall,
              while the lighter chair protects circulation near the window.
            </p>
          </article>
          <ProductStrip products={fixture.products} />
          <button type="button" className={styles.primaryAction}>
            Review 3 suggestions in Project Edit
            <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
          </button>
          <SessionDisclosure />
        </div>
      </div>
    </section>
  );
}

function VariantA({ fixture, state }: { fixture: ConsultationPrototypeFixture; state: PrototypeState }) {
  const selectedDimensions = activeDimensions(state.dimensionMode);

  return (
    <section className={`${styles.variant} ${styles.planningTable}`} aria-labelledby="variant-a-title">
      <aside className={styles.stepRail}>
        <div className={styles.sessionIdentity}>
          <ChatCircleDotsIcon size={24} weight="regular" aria-hidden="true" />
          <div>
            <strong>Living room plan</strong>
            <span>Restored at step 2 of 5</span>
          </div>
        </div>
        <nav aria-label="Consultation intake">
          <ol>
            {INTAKE_STEPS.map((step, index) => {
              const stepNumber = index + 1;
              return (
                <li key={step}>
                  <button
                    type="button"
                    data-active={state.intakeStep === stepNumber ? "true" : undefined}
                    onClick={() => state.setIntakeStep(stepNumber)}
                  >
                    <span>{stepNumber < state.intakeStep ? <CheckIcon size={14} weight="bold" /> : stepNumber}</span>
                    {step}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <SessionDisclosure />
      </aside>

      <main className={styles.intakeWorkspace}>
        <header className={styles.workspaceHeader}>
          <div>
            <h1 id="variant-a-title">Set the room size</h1>
            <p>Measurements control which catalog pieces can pass the first fit check.</p>
          </div>
          <span>{state.intakeStep} of {INTAKE_STEPS.length}</span>
        </header>

        <div className={styles.roomReference}>
          <Image
            src={fixture.room.image.url}
            alt="Sample uploaded living room for this prototype session"
            fill
            priority
            sizes="(max-width: 64rem) 100vw, 50vw"
          />
          <div>
            <FileImageIcon size={18} aria-hidden="true" />
            {state.fileName || "living-room-reference.jpg"}
          </div>
        </div>

        <DimensionChoices
          dimensionMode={state.dimensionMode}
          setDimensionMode={state.setDimensionMode}
        />
        <UploadControl fileName={state.fileName} setFileName={state.setFileName} />
      </main>

      <aside className={styles.liveBrief}>
        <div>
          <h2>Session brief</h2>
          <p>This updates as the intake continues.</p>
        </div>
        <dl>
          <div><dt>Room</dt><dd>{fixture.room.name}</dd></div>
          <div><dt>Reference</dt><dd>Room photo</dd></div>
          <div><dt>Size</dt><dd>{selectedDimensions.value}</dd></div>
          <div><dt>Style</dt><dd>Collected modern</dd></div>
          <div><dt>Use</dt><dd>Conversation and reading</dd></div>
          <div><dt>Keep</dt><dd>Oak media cabinet</dd></div>
          <div><dt>Investment</dt><dd>$15,000–$35,000</dd></div>
        </dl>
        <blockquote>
          “The medium scenario gives enough space for a generous sofa and two lighter seats.”
        </blockquote>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => state.setIntakeStep(Math.min(INTAKE_STEPS.length, state.intakeStep + 1))}
        >
          Continue to priorities
          <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className={styles.secondaryAction} onClick={() => state.setPhase("active")}>
          Preview active consultation
        </button>
        <p className={styles.entryModel}>Global entry: a quiet header action opens this workspace.</p>
      </aside>
    </section>
  );
}

function VariantB({ fixture, state }: { fixture: ConsultationPrototypeFixture; state: PrototypeState }) {
  const selectedDimensions = activeDimensions(state.dimensionMode);

  return (
    <section className={`${styles.variant} ${styles.roomCanvas}`} aria-labelledby="variant-b-title">
      <header className={styles.canvasHeader}>
        <div>
          <h1 id="variant-b-title">Living room consultation</h1>
          <p>Room-first workspace · Room photo · {selectedDimensions.value}</p>
        </div>
        <div className={styles.canvasProgress}>
          <span>Intake {state.intakeStep} of {INTAKE_STEPS.length}</span>
          <progress value={state.intakeStep} max={INTAKE_STEPS.length}>
            {state.intakeStep} of {INTAKE_STEPS.length}
          </progress>
        </div>
      </header>

      <div className={styles.canvasGrid}>
        <div className={styles.imageCanvas}>
          <Image
            src={fixture.room.image.url}
            alt="Sample uploaded living room for this prototype session"
            fill
            priority
            sizes="(max-width: 64rem) 100vw, 70vw"
          />
          <div className={styles.imageCaption}>
            <span>Sample room upload</span>
            <strong>{state.fileName || "living-room-reference.jpg"}</strong>
          </div>
        </div>

        <aside className={styles.canvasConversation}>
          <div className={styles.assistantHeading}>
            <SparkleIcon size={20} weight="fill" aria-hidden="true" />
            <div>
              <h2>Vestrel design assistant</h2>
              <p>Guided intake</p>
            </div>
          </div>
          <div className={styles.messageList}>
            <article>
              <p>I can read the room broadly, but I need dimensions before checking fit.</p>
              <time>Now</time>
            </article>
            <article className={styles.userMessage}>
              <p>Let’s use a medium room assumption for now.</p>
            </article>
            <article>
              <p>Good. I’ll plan with {selectedDimensions.value} and mark every fit result as provisional.</p>
            </article>
          </div>
          <div className={styles.quickDimensions} aria-label="Room size assumptions">
            {DIMENSION_OPTIONS.slice(1).map((option) => (
              <button
                type="button"
                key={option.key}
                aria-pressed={state.dimensionMode === option.key}
                onClick={() => state.setDimensionMode(option.key)}
              >
                <span>{option.label}</span>
                {option.value}
              </button>
            ))}
          </div>
          <div className={styles.messageComposer}>
            <textarea
              aria-label="Message the design assistant"
              rows={2}
              value={state.message}
              placeholder="Add a measurement or ask a question"
              onChange={(event) => state.setMessage(event.currentTarget.value)}
            />
            <button type="button" aria-label="Send message" disabled={!state.message.trim()}>
              <PaperPlaneTiltIcon size={19} weight="fill" aria-hidden="true" />
            </button>
          </div>
          <SessionDisclosure />
        </aside>
      </div>

      <div className={styles.canvasFooter}>
        <div>
          <h2>What the catalog search will consider</h2>
          <p>Clearance, scale, material balance, price, and the pieces already saved.</p>
        </div>
        <button type="button" className={styles.secondaryAction} onClick={() => state.setIntakeStep(3)}>
          Continue intake
          <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <button type="button" className={styles.fabPreview} onClick={() => state.setPhase("active")}>
        <ChatCircleDotsIcon size={22} weight="fill" aria-hidden="true" />
        <span>Resume design</span>
      </button>
    </section>
  );
}

function VariantC({ fixture, state }: { fixture: ConsultationPrototypeFixture; state: PrototypeState }) {
  const selectedDimensions = activeDimensions(state.dimensionMode);

  return (
    <section className={`${styles.variant} ${styles.guidedConversation}`} aria-labelledby="variant-c-title">
      <header className={styles.conversationHeader}>
        <div>
          <h1 id="variant-c-title">Let’s make the room make sense.</h1>
          <p>A guided conversation builds the brief before catalog recommendations appear.</p>
        </div>
        <button type="button" className={styles.secondaryAction}>Save and leave</button>
      </header>

      <ol className={styles.intakeTimeline} aria-label="Intake progress">
        {INTAKE_STEPS.map((step, index) => (
          <li key={step} data-active={index + 1 === state.intakeStep ? "true" : undefined}>
            <span>{index + 1 < state.intakeStep ? <CheckIcon size={13} weight="bold" /> : index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <p className={styles.mobileProgress}>Step {state.intakeStep} of {INTAKE_STEPS.length} · {INTAKE_STEPS[state.intakeStep - 1]}</p>

      <div className={styles.conversationLayout}>
        <main className={styles.interviewThread}>
          <div className={styles.interviewIntro}>
            <Image
              src={fixture.room.image.url}
              alt="Sample uploaded living room for this prototype session"
              width={fixture.room.image.width}
              height={fixture.room.image.height}
              priority
              sizes="(max-width: 64rem) 100vw, 58vw"
            />
            <div>
              <FileImageIcon size={18} aria-hidden="true" />
              <span>{state.fileName || "living-room-reference.jpg"}</span>
            </div>
          </div>

          <div className={styles.interviewQuestion}>
            <div className={styles.assistantMark}><SparkleIcon size={18} weight="fill" aria-hidden="true" /></div>
            <div>
              <h2>What dimensions should I use?</h2>
              <p>Exact measurements give stronger fit results. An assumption keeps this first conversation moving.</p>
              <div className={styles.answerRows}>
                {DIMENSION_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    data-selected={state.dimensionMode === option.key ? "true" : undefined}
                    onClick={() => state.setDimensionMode(option.key)}
                  >
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.note}</small>
                    </span>
                    <span>{option.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.interviewActions}>
            <UploadControl fileName={state.fileName} setFileName={state.setFileName} />
            <button type="button" className={styles.primaryAction} onClick={() => state.setIntakeStep(3)}>
              Use {selectedDimensions.label.toLowerCase()} size
              <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </main>

        <aside className={styles.recommendationPreview}>
          <div className={styles.previewHeading}>
            <div>
              <h2>Early direction</h2>
              <p>Preview only. Recommendations unlock after intake.</p>
            </div>
            <RulerIcon size={22} aria-hidden="true" />
          </div>
          <ProductStrip products={fixture.products} />
          <div className={styles.fitNote}>
            <strong>Why these are waiting</strong>
            <p>We need the room size, circulation needs, and investment before ranking products.</p>
          </div>
          <p className={styles.entryModel}>Global entry: Project Edit starts a pre-filled consultation.</p>
          <button type="button" className={styles.secondaryAction} onClick={() => state.setPhase("active")}>
            Preview active consultation
          </button>
          <SessionDisclosure />
        </aside>
      </div>
    </section>
  );
}

export function AiConsultationPrototype({
  fixture,
}: {
  readonly fixture: ConsultationPrototypeFixture;
}) {
  const searchParams = useSearchParams();
  const requestedVariant = searchParams.get("variant")?.toUpperCase();
  const variant = VARIANTS.some((candidate) => candidate.key === requestedVariant)
    ? requestedVariant as "A" | "B" | "C"
    : "A";
  const [intakeStep, setIntakeStep] = useState(2);
  const [phase, setPhase] = useState<"intake" | "active">("intake");
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>("medium");
  const [fileName, setFileName] = useState("living-room-reference.jpg");
  const [message, setMessage] = useState("");
  const state: PrototypeState = {
    phase,
    intakeStep,
    dimensionMode,
    fileName,
    message,
    setIntakeStep,
    setDimensionMode,
    setFileName,
    setMessage,
    setPhase,
  };

  return (
    <div className={styles.prototypePage}>
      {phase === "intake" ? <ResumeBanner state={state} /> : null}
      {phase === "active" ? <ActiveSessionPreview fixture={fixture} state={state} /> : null}
      {phase === "intake" && variant === "A" ? <VariantA fixture={fixture} state={state} /> : null}
      {phase === "intake" && variant === "B" ? <VariantB fixture={fixture} state={state} /> : null}
      {phase === "intake" && variant === "C" ? <VariantC fixture={fixture} state={state} /> : null}
      <PrototypeSwitcher variants={VARIANTS} current={variant} />
    </div>
  );
}
