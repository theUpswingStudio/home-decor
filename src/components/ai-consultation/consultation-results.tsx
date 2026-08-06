"use client";

import {
  ArrowRightIcon,
  PaperPlaneTiltIcon,
  SparkleIcon,
  StopIcon,
} from "@phosphor-icons/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProjectEdit } from "@/lib/project-edit";
import { fetchWithAiSessionRecovery } from "@/lib/ai/client-session";
import type {
  ConsultationIntake,
  ConsultationPreview,
  ConsultationResult,
  PreparedRoomAsset,
} from "@/lib/ai/consultation-types";
import styles from "./consultation-workspace.module.css";

interface ConsultationChatProps {
  readonly sessionId: string;
  readonly csrfToken: string;
  readonly refreshSession: () => Promise<string>;
  readonly intake: ConsultationIntake;
  readonly result: ConsultationResult;
  readonly initialMessages: readonly UIMessage[];
  readonly onMessagesChange: (messages: readonly UIMessage[]) => void;
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
  ),
};
const MARKDOWN_PLUGINS = [remarkGfm];

function AssistantMarkdown({ children }: { readonly children: string }) {
  return (
    <div className={styles.messageBody}>
      <Markdown
        components={MARKDOWN_COMPONENTS}
        remarkPlugins={MARKDOWN_PLUGINS}
        skipHtml
      >
        {children}
      </Markdown>
    </div>
  );
}

function ConsultationChat({
  sessionId,
  csrfToken,
  refreshSession,
  intake,
  result,
  initialMessages,
  onMessagesChange,
}: ConsultationChatProps) {
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/ai/consultation",
    credentials: "same-origin",
    fetch: (input, init) => fetchWithAiSessionRecovery(input, init, { renew: refreshSession }),
    headers: () => ({ "x-ai-csrf": csrfToken }),
    body: () => ({
      action: "chat",
      intake,
      context: {
        analysis: result.analysis,
        recommendations: result.recommendations.map(({ productId, variantId }) => ({
          productId,
          variantId,
        })),
      },
    }),
  }), [csrfToken, intake, refreshSession, result]);
  const { messages, sendMessage, status, stop, error } = useChat({
    id: sessionId,
    messages: [...initialMessages],
    transport,
  });

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  const busy = status === "submitted" || status === "streaming";

  return (
    <section className={styles.chat} aria-labelledby="consultation-chat-title">
      <header>
        <h2 id="consultation-chat-title">Discuss the edit</h2>
        <p>Ask about scale, color, price, or why each piece was selected.</p>
      </header>
      <div className={styles.messages} aria-live="polite">
        <article className={styles.assistantMessage}>
          <span>Vestrel assistant</span>
          <div className={styles.messageBubble}>
            <AssistantMarkdown>{result.assistantMessage}</AssistantMarkdown>
          </div>
        </article>
        {messages.map((message) => {
          const text = messageText(message);
          if (!text || message.role === "system") return null;
          return (
            <article
              key={message.id}
              className={message.role === "user" ? styles.userMessage : styles.assistantMessage}
            >
              <span>{message.role === "user" ? "You" : "Vestrel assistant"}</span>
              <div className={styles.messageBubble}>
                {message.role === "user"
                  ? <p className={styles.plainMessage}>{text}</p>
                  : <AssistantMarkdown>{text}</AssistantMarkdown>}
              </div>
            </article>
          );
        })}
        {status === "submitted" ? <p className={styles.thinking}>Reviewing the room edit…</p> : null}
      </div>
      {error ? <p className={styles.requestError} role="alert">{error.message}</p> : null}
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          void sendMessage({ text });
          setInput("");
        }}
      >
        <label>
          <span className="sr-only">Message the design assistant</span>
          <textarea
            rows={3}
            value={input}
            placeholder="Ask why a finish works or whether another piece would suit the room."
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (input.trim() && !busy) event.currentTarget.form?.requestSubmit();
            }}
          />
        </label>
        <div className={styles.composerFooter}>
          <p>Enter to send · Shift + Enter for a new line</p>
          {busy ? (
            <button type="button" onClick={stop}>
              <StopIcon size={16} weight="fill" aria-hidden="true" />
              Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()}>
              <PaperPlaneTiltIcon size={17} weight="fill" aria-hidden="true" />
              Send
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

interface ConsultationResultsProps extends ConsultationChatProps {
  readonly room: PreparedRoomAsset | null;
  readonly roomUrl: string;
  readonly preview: ConsultationPreview;
  readonly previewUrl: string;
  readonly selectedProductIds: readonly string[];
  readonly onSelectedProductIdsChange: (productIds: readonly string[]) => void;
  readonly onRetryPreview: (productIds: readonly string[]) => void;
  readonly onRevise: () => void;
}

function sameProductSelection(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightIds = new Set(right);
  return left.every((productId) => rightIds.has(productId));
}

function RoomPreviewSection({
  room,
  roomUrl,
  preview,
  previewUrl,
  selectedProductIds,
  onRetry,
}: {
  readonly room: PreparedRoomAsset | null;
  readonly roomUrl: string;
  readonly preview: ConsultationPreview;
  readonly previewUrl: string;
  readonly selectedProductIds: readonly string[];
  readonly onRetry: (productIds: readonly string[]) => void;
}) {
  const selectionChanged = preview.productIds.length > 0
    && !sameProductSelection(preview.productIds, selectedProductIds);
  const canRetry = preview.attempt === 1
    && (preview.status === "ready" || preview.status === "error");

  return (
    <section className={styles.previewSection} aria-labelledby="room-preview-title">
      <header className={styles.previewHeading}>
        <div>
          <h2 id="room-preview-title">Your room, reimagined</h2>
          <p>A high-quality concept built from the room and selected catalog references.</p>
        </div>
        {preview.status === "rendering" ? <span aria-hidden="true">Rendering</span> : null}
      </header>

      {preview.status === "rendering" ? (
        <div className={styles.previewProgress} role="status" aria-live="polite">
          <SparkleIcon size={24} weight="fill" aria-hidden="true" />
          <div>
            <strong>Composing the room preview</strong>
            <p>The recommendations and chat remain available while the image renders.</p>
          </div>
          <span className={styles.previewProgressLine} aria-hidden="true" />
        </div>
      ) : null}

      {room && roomUrl && preview.blob && previewUrl ? (
        <div className={styles.previewComparison}>
          <figure>
            <div className={styles.previewImageFrame}>
              <Image
                src={roomUrl}
                alt="Original uploaded room"
                width={room.width}
                height={room.height}
                sizes="(max-width: 48rem) 100vw, 50vw"
                unoptimized
              />
            </div>
            <figcaption>Original room</figcaption>
          </figure>
          <figure>
            <div className={styles.previewImageFrame}>
              <Image
                src={previewUrl}
                alt="AI-generated room concept with the recommended furniture"
                width={room.width}
                height={room.height}
                sizes="(max-width: 48rem) 100vw, 50vw"
                unoptimized
              />
            </div>
            <figcaption>AI concept preview</figcaption>
          </figure>
        </div>
      ) : null}

      {preview.status === "ready" && !previewUrl ? (
        <p className={styles.previewRestore} role="status">Restoring the saved preview…</p>
      ) : null}

      {preview.status === "error" || preview.status === "unavailable" ? (
        <div className={styles.previewError} role="alert">
          <strong>{preview.status === "unavailable" ? "Preview unavailable" : "Preview not completed"}</strong>
          <p>{preview.error}</p>
        </div>
      ) : null}

      {selectionChanged && preview.status === "ready" ? (
        <p className={styles.previewSelectionNote}>
          This image uses the earlier recommendation selection. Render again to use the current products.
        </p>
      ) : null}

      <footer className={styles.previewFooter}>
        <p>AI concept preview. Product details, color, scale, and placement can differ.</p>
        {canRetry ? (
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={selectedProductIds.length === 0}
            onClick={() => onRetry(selectedProductIds)}
          >
            <SparkleIcon size={17} weight="fill" aria-hidden="true" />
            {selectionChanged ? "Render current selection" : "Try one more render"}
          </button>
        ) : null}
      </footer>
    </section>
  );
}

export function ConsultationResults({
  sessionId,
  csrfToken,
  refreshSession,
  intake,
  result,
  room,
  roomUrl,
  preview,
  previewUrl,
  selectedProductIds,
  initialMessages,
  onMessagesChange,
  onSelectedProductIdsChange,
  onRetryPreview,
  onRevise,
}: ConsultationResultsProps) {
  const router = useRouter();
  const projectEdit = useProjectEdit();
  const [saveError, setSaveError] = useState("");

  function toggleProduct(productId: string) {
    onSelectedProductIdsChange(selectedProductIds.includes(productId)
      ? selectedProductIds.filter((value) => value !== productId)
      : [...selectedProductIds, productId]);
  }

  function acceptConfiguration() {
    const configuration = result.recommendations
      .filter((product) => selectedProductIds.includes(product.productId))
      .map((product) => ({
        productId: product.productId,
        variantId: product.variantId,
        quantity: 1,
      }));
    if (configuration.length === 0) {
      setSaveError("Choose at least one product for Project Edit.");
      return;
    }
    const outcome = projectEdit.saveProducts(configuration);
    if (!outcome.changed && outcome.reason !== "already-saved") {
      setSaveError(outcome.reason === "entry-limit"
        ? "Project Edit is full. Remove an entry before adding this configuration."
        : "This configuration could not be added. Review the products and try again.");
      return;
    }
    router.push("/project-edit?source=ai");
  }

  return (
    <div className={styles.resultsLayout}>
      <RoomPreviewSection
        room={room}
        roomUrl={roomUrl}
        preview={preview}
        previewUrl={previewUrl}
        selectedProductIds={selectedProductIds}
        onRetry={onRetryPreview}
      />
      <div className={styles.resultMain}>
        <section className={styles.analysis} aria-labelledby="analysis-title">
          <div className={styles.analysisHeading}>
            <div>
              <h2 id="analysis-title">Your first room edit</h2>
              <p>{result.analysis.summary}</p>
            </div>
            <button type="button" className={styles.textButton} onClick={onRevise}>Revise brief</button>
          </div>
          <div className={styles.analysisLimitations}>
            <strong>What this image cannot confirm</strong>
            <ul>
              {result.analysis.limitations.slice(0, 3).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </div>
          <dl className={styles.paletteFacts}>
            <div><dt>Palette</dt><dd>{result.analysis.palette.dominantColors.join(", ")}</dd></div>
            <div><dt>Undertone</dt><dd>{result.analysis.palette.undertone}</dd></div>
            <div><dt>Contrast</dt><dd>{result.analysis.palette.contrast}</dd></div>
          </dl>
          <ul className={styles.observations}>
            {result.analysis.observations.map((observation) => (
              <li key={observation.label}>
                <strong>{observation.label}</strong>
                <p>{observation.detail}</p>
                <span>{observation.confidence} confidence</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.recommendations} aria-labelledby="recommendations-title">
          <div className={styles.sectionHeading}>
            <h2 id="recommendations-title">Catalog recommendations</h2>
            <p>Choose the pieces you want to carry into Project Edit.</p>
          </div>
          <ul>
            {result.recommendations.map((product) => (
              <li key={product.productId}>
                <article className={styles.productRecommendation}>
                  <label className={styles.productSelection}>
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.productId)}
                      onChange={() => toggleProduct(product.productId)}
                    />
                    <span>Include in Project Edit</span>
                  </label>
                  <Link href={`/products/${product.slug}`} className={styles.productImageLink}>
                    <Image
                      src={product.image.url}
                      alt={product.image.alt}
                      width={product.image.width}
                      height={product.image.height}
                      sizes="(max-width: 48rem) 100vw, 20rem"
                    />
                  </Link>
                  <div className={styles.productBody}>
                    <div className={styles.productTitle}>
                      <div>
                        <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
                        <p>{product.finish}</p>
                      </div>
                      <strong>{product.priceLabel}</strong>
                    </div>
                    <p>{product.description}</p>
                    <p className={styles.productDimensions}>{product.dimensionsLabel}</p>
                    <ul className={styles.reasons}>
                      {product.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

      </div>

      <aside className={styles.acceptPanel} aria-labelledby="accept-title">
        <div>
          <h2 id="accept-title">Move this edit forward</h2>
          <p>{selectedProductIds.length} of {result.recommendations.length} products selected</p>
        </div>
        <p>
          Project Edit keeps the selected products together. You can then start a consultation preview with those products pre-filled.
        </p>
        <button type="button" className={styles.primaryButton} onClick={acceptConfiguration}>
          Accept configuration
          <ArrowRightIcon size={18} aria-hidden="true" />
        </button>
        {saveError ? <p className={styles.requestError} role="alert">{saveError}</p> : null}
        <p className={styles.disclosure}>
          Initial inspiration only. Confirm measurements, access, finishes, and final pricing with a consultant.
        </p>
        {result.generatedBy === "demo" ? (
          <p className={styles.demoNotice}>Demo analysis is active for this environment.</p>
        ) : null}
      </aside>

      <ConsultationChat
        sessionId={sessionId}
        csrfToken={csrfToken}
        refreshSession={refreshSession}
        intake={intake}
        result={result}
        initialMessages={initialMessages}
        onMessagesChange={onMessagesChange}
      />
    </div>
  );
}
