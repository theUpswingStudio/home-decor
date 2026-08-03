"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { InquiryConfig, InquiryOption } from "@/data/catalog";
import { Button, ButtonLink } from "@/components/ui/button";
import { useProjectEdit } from "@/lib/project-edit";
import {
  buildInquiryContext,
  demonstrateInquirySubmission,
  isSupportedPostalCode,
  type InquirySubmission,
} from "./inquiry-types";
import styles from "./inquiry-form.module.css";

interface InquiryFormProps {
  readonly inquiry: InquiryConfig;
  readonly fromProjectEdit: boolean;
}

interface FormValues {
  readonly designService: string;
  readonly scope: string;
  readonly postalCode: string;
  readonly timeline: string;
  readonly investment: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly notes: string;
}

type FormField = keyof FormValues;
type FormErrors = Partial<Record<FormField, string>>;

const INITIAL_VALUES: FormValues = {
  designService: "",
  scope: "",
  postalCode: "",
  timeline: "",
  investment: "",
  fullName: "",
  email: "",
  phone: "",
  notes: "",
};

const FIELD_LABELS: Record<FormField, string> = {
  designService: "Design service",
  scope: "Project scope",
  postalCode: "ZIP or postal code",
  timeline: "Timeline",
  investment: "Investment",
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  notes: "Project notes",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RADIO_FIELDS: readonly FormField[] = [
  "designService",
  "scope",
  "timeline",
  "investment",
];

function hasOption(options: readonly InquiryOption[], value: string): boolean {
  return options.some((option) => option.id === value);
}

function validateProject(
  values: FormValues,
  inquiry: InquiryConfig,
): FormErrors {
  const errors: FormErrors = {};
  if (!hasOption(inquiry.serviceOptions, values.designService)) {
    errors.designService = "Choose a design service.";
  }
  if (!hasOption(inquiry.scopeOptions, values.scope)) {
    errors.scope = "Choose the project scope.";
  }
  if (!isSupportedPostalCode(values.postalCode)) {
    errors.postalCode = "Enter a valid US ZIP or Canadian postal code.";
  }
  if (!hasOption(inquiry.timelineOptions, values.timeline)) {
    errors.timeline = "Choose a project timeline.";
  }
  if (!hasOption(inquiry.investmentOptions, values.investment)) {
    errors.investment = "Choose a working investment range.";
  }
  return errors;
}

function validateDetails(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.fullName.trim().length < 2) {
    errors.fullName = "Enter your full name.";
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.phone.trim() && values.phone.trim().length < 7) {
    errors.phone = "Enter a complete phone number or leave this field blank.";
  }
  return errors;
}

interface RadioFieldProps {
  readonly legend: string;
  readonly field: "designService" | "scope" | "timeline" | "investment";
  readonly options: readonly InquiryOption[];
  readonly value: string;
  readonly error?: string;
  readonly onChange: (value: string) => void;
}

function RadioField({
  legend,
  field,
  options,
  value,
  error,
  onChange,
}: RadioFieldProps) {
  const errorId = `${field}-error`;

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    optionIndex: number,
  ) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (optionIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (optionIndex - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextOption = options[nextIndex];
    onChange(nextOption.id);
    document.getElementById(`${field}-${nextOption.id}`)?.focus();
  }

  return (
    <fieldset
      id={`${field}-field`}
      className={styles.fieldset}
      tabIndex={-1}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? "true" : undefined}
    >
      <legend>
        {legend} <span className={styles.requirement}>Required</span>
      </legend>
      <div className={styles.radioGrid}>
        {options.map((option, optionIndex) => {
          const inputId = `${field}-${option.id}`;
          return (
            <label className={styles.radioOption} htmlFor={inputId} key={option.id}>
              <input
                id={inputId}
                type="radio"
                value={option.id}
                checked={value === option.id}
                required
                tabIndex={
                  value ? (value === option.id ? 0 : -1) : optionIndex === 0 ? 0 : -1
                }
                onChange={() => onChange(option.id)}
                onKeyDown={(event) => handleKeyDown(event, optionIndex)}
              />
              <span>
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className={styles.fieldError} id={errorId}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

interface ErrorSummaryProps {
  readonly errors: FormErrors;
  readonly summaryRef: React.RefObject<HTMLDivElement | null>;
}

function ErrorSummary({ errors, summaryRef }: ErrorSummaryProps) {
  const entries = Object.entries(errors) as [FormField, string][];
  if (entries.length === 0) return null;

  return (
    <div
      className={styles.errorSummary}
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby="inquiry-errors-title"
    >
      <h2 id="inquiry-errors-title">Check the following fields</h2>
      <ul>
        {entries.map(([field, message]) => {
          const targetId = RADIO_FIELDS.includes(field)
            ? `${field}-field`
            : field;
          return (
            <li key={field}>
              <a
                href={`#${targetId}`}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(targetId)?.focus();
                }}
              >
                {FIELD_LABELS[field]}: {message}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProjectEditSelectionSummary() {
  const projectEdit = useProjectEdit();

  return (
    <section className={styles.cartSelection} aria-labelledby="cart-selection-title">
      <h2 id="cart-selection-title">Selections from your Project Edit</h2>
      {projectEdit.status === "loading" ? (
        <p aria-live="polite">Loading saved selections…</p>
      ) : projectEdit.entryCount === 0 ? (
        <p>
          There are no current selections to attach. You can continue without
          them or <Link href="/project-edit">return to Project Edit</Link>.
        </p>
      ) : (
        <ul>
          {projectEdit.products.map((item) => (
            <li key={item.key}>
              <span>
                <strong>{item.product.name}</strong>
                <span>
                  {item.variant
                    ? item.variant.options.map((option) => option.value).join(" / ")
                    : "Finish not selected"}
                </span>
              </span>
              <span>Qty. {item.entry.quantity}</span>
            </li>
          ))}
          {projectEdit.rooms.map((item) => (
            <li key={item.key}>
              <span><strong>{item.room.name}</strong><span>Room direction</span></span>
            </li>
          ))}
          {projectEdit.materials.map((item) => (
            <li key={item.key}>
              <span><strong>{item.collection.name}</strong><span>Material note</span></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InquiryForm({ inquiry, fromProjectEdit }: InquiryFormProps) {
  const projectEdit = useProjectEdit();
  const [step, setStep] = useState<1 | 2>(1);
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [demonstrationComplete, setDemonstrationComplete] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const previousViewRef = useRef("step-1");

  const view = demonstrationComplete ? "complete" : `step-${step}`;
  useEffect(() => {
    if (previousViewRef.current !== view) {
      previousViewRef.current = view;
      headingRef.current?.focus();
    }
  }, [view]);

  function updateField<Field extends FormField>(
    field: Field,
    value: FormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function reportErrors(nextErrors: FormErrors) {
    setErrors(nextErrors);
    window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }

  function buildSubmission(): InquirySubmission {
    const selectedItems = projectEdit.products.flatMap((item) =>
      item.variant
        ? [{ variantId: item.variant.id, quantity: item.entry.quantity }]
        : [],
    );
    const selectedEntries = projectEdit.entries.map((entry) => {
      if (entry.type === "product") {
        return {
          type: "product" as const,
          productId: entry.productId,
          ...(entry.variantId ? { variantId: entry.variantId } : {}),
          quantity: entry.quantity,
        };
      }
      if (entry.type === "room") return { type: "room" as const, roomId: entry.roomId };
      return { type: "material" as const, collectionId: entry.collectionId };
    });
    return {
      version: 1,
      project: {
        designService: values.designService,
        scope: values.scope,
        postalCode: values.postalCode.trim(),
        timeline: values.timeline,
        investment: values.investment,
      },
      contact: {
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
        ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
      },
      context: buildInquiryContext(
        fromProjectEdit ? "project-edit" : "direct",
        selectedItems,
        selectedEntries,
      ),
    };
  }

  function advanceInquiry() {
    if (step === 1) {
      const nextErrors = validateProject(values, inquiry);
      if (Object.keys(nextErrors).length > 0) {
        reportErrors(nextErrors);
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }

    const nextErrors = validateDetails(values);
    if (Object.keys(nextErrors).length > 0) {
      reportErrors(nextErrors);
      return;
    }

    demonstrateInquirySubmission(buildSubmission());
    setErrors({});
    setDemonstrationComplete(true);
  }

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (
      event.key !== "Enter" ||
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      !(event.target instanceof HTMLInputElement) ||
      !["text", "email", "tel"].includes(event.target.type)
    ) {
      return;
    }

    event.preventDefault();
    advanceInquiry();
  }

  if (demonstrationComplete) {
    return (
      <section className={styles.complete} aria-labelledby="demo-complete-title">
        <p className={styles.stepLabel}>Demonstration complete</p>
        <h1 id="demo-complete-title" ref={headingRef} tabIndex={-1}>
          No inquiry was transmitted.
        </h1>
        <p>
          This portfolio form is a demonstration only. Your details were not
          sent to Vestrel House, a consultant, Google Sheets, or any server.
        </p>
        <p>
          The form state will disappear when you leave this page; personal
          information is not saved in browser storage.
        </p>
        <div className={styles.completeActions}>
          <ButtonLink href="/design-services">Review design services</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Return home
          </ButtonLink>
        </div>
      </section>
    );
  }

  const stepConfig = inquiry.steps[step - 1];

  return (
    <div className={styles.layout}>
      <div className={styles.intro}>
        <p className={styles.stepLabel}>Step {step} of 2</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {stepConfig.title}
        </h1>
        <p>{stepConfig.description}</p>
        <p className={styles.response}>{inquiry.responseExpectation}</p>
      </div>

      {fromProjectEdit ? <ProjectEditSelectionSummary /> : null}

      <form className={styles.form} noValidate onKeyDown={handleFormKeyDown}>
        <ErrorSummary errors={errors} summaryRef={errorSummaryRef} />

        {step === 1 ? (
          <div className={styles.fields}>
            <RadioField
              legend="Which design service do you need?"
              field="designService"
              options={inquiry.serviceOptions}
              value={values.designService}
              error={errors.designService}
              onChange={(value) => updateField("designService", value)}
            />
            <RadioField
              legend="What is the project scope?"
              field="scope"
              options={inquiry.scopeOptions}
              value={values.scope}
              error={errors.scope}
              onChange={(value) => updateField("scope", value)}
            />

            <div className={styles.textField} id="postalCode-field">
              <label htmlFor="postalCode">
                ZIP or postal code <span className={styles.requirement}>Required</span>
              </label>
              <p id="postalCode-hint">Used to frame delivery and service availability.</p>
              <input
                id="postalCode"
                type="text"
                autoComplete="postal-code"
                inputMode="text"
                maxLength={12}
                required
                value={values.postalCode}
                aria-invalid={errors.postalCode ? "true" : undefined}
                aria-describedby={`postalCode-hint${errors.postalCode ? " postalCode-error" : ""}`}
                onChange={(event) =>
                  updateField("postalCode", event.currentTarget.value)
                }
              />
              {errors.postalCode ? (
                <p className={styles.fieldError} id="postalCode-error">
                  {errors.postalCode}
                </p>
              ) : null}
            </div>

            <RadioField
              legend="What is your timeline?"
              field="timeline"
              options={inquiry.timelineOptions}
              value={values.timeline}
              error={errors.timeline}
              onChange={(value) => updateField("timeline", value)}
            />
            <RadioField
              legend="What is the working investment?"
              field="investment"
              options={inquiry.investmentOptions}
              value={values.investment}
              error={errors.investment}
              onChange={(value) => updateField("investment", value)}
            />
          </div>
        ) : (
          <div className={styles.fields}>
            <div className={styles.textField} id="fullName-field">
              <label htmlFor="fullName">
                Full name <span className={styles.requirement}>Required</span>
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                maxLength={100}
                required
                value={values.fullName}
                aria-invalid={errors.fullName ? "true" : undefined}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                onChange={(event) =>
                  updateField("fullName", event.currentTarget.value)
                }
              />
              {errors.fullName ? (
                <p className={styles.fieldError} id="fullName-error">
                  {errors.fullName}
                </p>
              ) : null}
            </div>

            <div className={styles.textField} id="email-field">
              <label htmlFor="email">
                Email <span className={styles.requirement}>Required</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                required
                value={values.email}
                aria-invalid={errors.email ? "true" : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                onChange={(event) =>
                  updateField("email", event.currentTarget.value)
                }
              />
              {errors.email ? (
                <p className={styles.fieldError} id="email-error">
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className={styles.textField} id="phone-field">
              <label htmlFor="phone">
                Phone <span className={styles.requirement}>Optional</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
                value={values.phone}
                aria-invalid={errors.phone ? "true" : undefined}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                onChange={(event) =>
                  updateField("phone", event.currentTarget.value)
                }
              />
              {errors.phone ? (
                <p className={styles.fieldError} id="phone-error">
                  {errors.phone}
                </p>
              ) : null}
            </div>

            <div className={styles.textField} id="notes-field">
              <label htmlFor="notes">
                Project notes <span className={styles.requirement}>Optional</span>
              </label>
              <p id="notes-hint">
                Share room dimensions, priorities, constraints, or pieces you
                plan to keep. Do not include payment information or access codes.
              </p>
              <textarea
                id="notes"
                rows={7}
                maxLength={1200}
                value={values.notes}
                aria-describedby="notes-hint notes-count"
                onChange={(event) =>
                  updateField("notes", event.currentTarget.value)
                }
              />
              <p className={styles.characterCount} id="notes-count">
                {values.notes.length} / 1200 characters
              </p>
            </div>
          </div>
        )}

        <div className={styles.formFooter}>
          {step === 2 ? (
            <Button
              className={styles.backButton}
              type="button"
              variant="secondary"
              onClick={() => {
                setErrors({});
                setStep(1);
              }}
            >
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={step === 2 && fromProjectEdit && projectEdit.status !== "ready"}
            onClick={advanceInquiry}
          >
            {step === 1 ? "Continue to details" : "Complete demonstration"}
          </Button>
        </div>

        {step === 2 ? (
          <p className={styles.privacy}>
            {inquiry.privacyNote} Read the <Link href="/privacy">privacy policy</Link>.
          </p>
        ) : null}
      </form>
    </div>
  );
}
