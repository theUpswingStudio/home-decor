# Generation with answer review implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show immediate generation feedback while users review submitted answers without interrupting the request or losing their place.

**Architecture:** Keep generation request ownership in `ConsultationWorkspace`, with bounded client deadlines and abort-aware credential recovery. Keep review navigation separate from the persisted intake step and keep results mounted during review. Add focused generation, answer-review, and destructive-reset presentation components. Bypass time-based throttling only in development; production-style browser tests retain real security with isolated network keys.

**Tech Stack:** Next.js 16.2, React 19.2, TypeScript 6, CSS Modules, Phosphor icons, AI SDK 6, Playwright, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-08-generation-answer-review.md`. Read the spec and the approved prototype before execution.

## Global constraints

- Use Next.js 16, React 19, TypeScript, and the existing CSS module.
- Add no runtime dependencies.
- Keep the analysis and preview API contracts unchanged.
- Keep the consultation storage schema and retention policy unchanged.
- Use existing Vestrel House fonts, colors, spacing, and controls.
- Meet WCAG 2.2 AA and support widths from 320 CSS pixels.
- Respect reduced-motion preferences.
- Use short, active sentences and sentence-case labels.
- Never use `rm`; use `trash` or `gio trash` if deletion is necessary.
- Do not change unrelated files or user-owned assets.

## 1. Evidence and scope

### Current implementation

| Source | Relevant behavior |
| --- | --- |
| `src/components/ai-consultation/consultation-workspace.tsx:162-199` | `analyze()` sets `busy`, awaits the complete JSON response, saves results, then starts preview generation. |
| `src/components/ai-consultation/consultation-workspace.tsx:66-160` | `renderPreview()` owns an abort controller and request identity. Most response paths check ownership, but the error-body await needs another check. |
| `src/components/ai-consultation/consultation-intake.tsx:317-367` | Submission disables the button and changes its label. The surrounding form remains visible. |
| `src/components/ai-consultation/use-consultation-session.ts` | `setResult()` sets the durable step to 5. `reviseBrief()` clears results and moves to step 4. Intake edits clear the result and preview. |
| `src/components/ai-consultation/consultation-results.tsx` | Chat has component-local draft and stream state. Preview errors do not remove recommendations. |
| `src/components/ai-consultation/consultation-workspace.module.css` | The timeline is hidden below 40rem. Existing preview motion respects reduced motion. |
| `src/lib/ai/client-session.ts` | A 401 retries with the original signal, but the separate credential-renewal request currently receives no signal. |
| `e2e/ai-consultation.spec.ts` | Tests cover preview retry, selected products, restore without chat, reset, and image failure. |
| `playwright.config.ts` | Desktop Chrome and Pixel 7 projects run against port 3100 with mock analysis and configured preview availability. |

Graph project: `var-home-shubham-Projects-home-decor`. Verification tier: Verify. Coverage generation: `2026-09-02T04:28:32Z`.

Exact-path coverage reported matching metadata and no recorded gaps for the listed production files and test configuration. The prototype is untracked and was read directly. Graph calls confirmed `ConsultationWorkspace → analyze → renderPreview` and the direct session-recovery dependencies. Broad discovery returned 67 matches and only displayed 50; this plan does not rely on an exhaustive symbol inventory. Material functions and files were checked directly. Line numbers are orientation points, not edit instructions.

### Scope exclusions

Do not add production streaming endpoints, server jobs, progress percentages, wait-time estimates, a separate Cancel generation button, notifications outside this page, persistent review state, or a new design system. Do not migrate the prototype into production. Do not change recommendation ranking, image prompts, retry quotas, or AI SDK transport protocols. Test-only streaming fixtures are permitted.

### Review disposition

- User decision: disable local development time-based rate limiting. Production stays protected.
- User decision: defer the pending-image-replacement race. Do not silently fix it or claim snapshot consistency under that race.
- Recommendation for this revision: keep Start over available with destructive confirmation. This replaces the earlier inferred reset lock.
- Required corrections: check obsolete preview errors after body parsing, propagate cancellation through credential recovery, test both preview restore attempts, test scroll stability, and verify actual partial-stream continuity.
- Tests must run against real mock-backed server validation where relevant. UI-only interceptions cannot establish server quota, credential expiry, or provider cancellation behavior.

### Assumptions to retain during execution

- The four completed intake steps are what the user means by other sections.
- `Build recommendations` keeps its current label.
- Read-only review uses summaries, not disabled form controls.
- Intake editing stays locked until analysis and image rendering stop. Product selection and chat remain available.
- `Revise brief` stays disabled during generation. `Start over` stays available, but confirms destruction before aborting client work.
- Start over resets the local design, not the signed AI session or its preview allowance.
- An outstanding image replacement is an accepted exception to submitted-answer consistency. Ordinary review itself cannot mutate answers.
- The user has requested a plan first. Stop after planning; do not treat this file as permission to implement.

## 2. File map

| Action | Path | Responsibility |
| --- | --- | --- |
| Modify | `src/components/ai-consultation/consultation-workspace.tsx` | Local navigation, request guard, state-derived feedback, focus coordination, result mounting. |
| Create | `src/components/ai-consultation/consultation-generation.tsx` | Dedicated generation view and compact persistent status. |
| Create | `src/components/ai-consultation/consultation-answer-review.tsx` | Read-only answers for the four completed steps. |
| Modify | `src/components/ai-consultation/consultation-results.tsx` | Brief-edit lock, chat-busy notification for reset copy, and verified chat cleanup on true disposal. |
| Modify | `src/components/ai-consultation/consultation-workspace.module.css` | Generation layout, review layout, clickable timeline, mobile layout, sticky status and focus offsets. |
| Create | `e2e/helpers/ai-consultation.ts` | Shared JPEG/intake helpers and a fixture that isolates test network identities. |
| Modify | `e2e/ai-consultation.spec.ts` | Import shared helpers and preserve existing regression coverage. |
| Create | `e2e/ai-consultation-generation.spec.ts` | Delayed requests, read-only review, completion, recovery, chat continuity, keyboard and accessibility checks. |

Additional bounded files introduced by review:

| Action | Path | Responsibility |
| --- | --- | --- |
| Modify | `src/lib/ai/security.ts` | Development-only time-window bypass, with authentication unchanged. |
| Create | `tests/ai-security.test.ts` | Development bypass and production enforcement, origin, CSRF, and size checks. |
| Modify | `src/lib/ai/client-session.ts` | Pass request cancellation to renewal; reject obsolete retries. |
| Modify | `tests/ai-session-client.test.ts` | Abort-before-renewal, abort-during-renewal, no stale retry. |
| Modify | `src/components/ai-consultation/use-consultation-session.ts` | Bounded handshake, safe reset persistence, truthful attempt-2 restoration message. No review state. |
| Modify | `src/lib/ai/consultation-storage.ts` | Serialize save and clear operations only as needed for confirmed-reset ordering. No schema change. |
| Modify | `tests/consultation-storage.test.ts` | Pending save followed by clear cannot restore a discarded draft. |
| Create | `src/components/ai-consultation/consultation-reset-dialog.tsx` | Native confirmation dialog and safe default focus. |
| Modify | `src/app/api/ai/consultation/preview/route.ts` | Correct 409 copy that currently suggests a new consultation resets signed-session attempts. |
| Create | `e2e/helpers/consultation-stream.ts` | Test-only real multi-chunk response fixture, never a production route. |

Do not add view state to the session hook or storage types. Do not add a reducer merely to mirror `busy`, `result`, or `preview.status`. Local React state and request refs are sufficient. The upload race remains deferred; do not expand into image-preparation refactoring.

## 3. State and interaction contract

### Local view state

Keep the existing `busy` and `requestError` state. Add this view state, plus local reset-confirmation state and request-lifecycle refs:

```tsx
type ReviewStep = 1 | 2 | 3 | 4;
const [reviewStep, setReviewStep] = useState<ReviewStep | null>(null);
const [generationStarted, setGenerationStarted] = useState(false);
const [chatBusy, setChatBusy] = useState(false);
const sessionEpoch = useRef(0);
const [callbackEpoch, setCallbackEpoch] = useState(0);

const result = session.state.result;
const preview = session.state.preview;
const generationActive = busy || preview.status === "rendering";
const hasDesignWorkspace = generationStarted || Boolean(result);
```

Export `ReviewStep` from the answer-review module and import it in the workspace. `generationStarted` also keeps the error view visible after analysis fails. A restored result opens the design workspace without restoring review navigation.

On an accepted submission, set `generationStarted` to true and clear `reviewStep` before any await. Review clicks set only `reviewStep`. They must not call `session.setStep`, `updateIntake`, `setRoom`, or `reviseBrief`.

On successful analysis, call the existing `setResult()` and `renderPreview()`. Do not clear `reviewStep`. On preview completion or failure, do not change navigation.

On explicit revision, check `generationActive` and keep editing blocked while it is true. On Start over, open confirmation without changing requests or local data. Only confirmed reset invalidates old request identities, aborts analysis/preview/chat, clears view/error state, clears the durable design, and returns to step 1. Dismissing confirmation preserves everything. Reset must not wait for provider acknowledgement.

Start over is an escape from stalled work, not a retry action. Keep the same signed cookie and server attempt accounting. Add no quota reset endpoint. If a new draft cannot render because its signed-session attempt is already consumed, retain its recommendations and show the quota error. Do not instruct users to Start over again.

Proposed internal recovery ceilings: 120 seconds for analysis including image conversion/recovery; 210 seconds for preview delivery including recovery; 20 seconds for each handshake. These are engineering defaults to validate against real latency, not measured service guarantees or displayed ETAs. Timers must transition the owning UI request to failure even if an awaited operation ignores abort. Clear timers on every terminal path and confirmed reset. Late completions must fail ownership checks.

### Display rules

| Condition | Design area | Review area | Editing |
| --- | --- | --- | --- |
| Before submission, no restored result | Existing intake | Absent | Existing behavior |
| Analysis running, no review | Generation photo and compact brief | Absent | Locked |
| Analysis running, review selected | Hidden | Selected submitted answers | Locked |
| Results ready, no review | Existing results and independent preview state | Absent | Locked only while preview renders |
| Results ready, review selected | Mounted but hidden | Selected submitted answers | Locked only while preview renders |
| Analysis failed | Error and retry in design area | Keep selected review if open | Explicit revision allowed |
| Preview failed/unavailable | Existing recommendations and preview error | Keep selected review if open | Explicit revision allowed |
| Restored result | Existing results | Available on demand | Derive from restored preview state |

A review summary remains read-only after completion. Editing is a distinct `Revise brief` action, not an automatic unlock of its fields.

### Presentation interfaces

Create these exports in `consultation-generation.tsx`:

```tsx
import type {
  ConsultationIntake,
  ConsultationPreviewStatus,
  PreparedRoomAsset,
} from "@/lib/ai/consultation-types";

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
```

Export `ConsultationGeneration` and `ConsultationGenerationStatus` with those props. The status component derives text from existing state. Do not give it timers or another progress state.

Create this export in `consultation-answer-review.tsx`:

```tsx
import type {
  ConsultationIntake,
  PreparedRoomAsset,
} from "@/lib/ai/consultation-types";

export type ReviewStep = 1 | 2 | 3 | 4;

interface ConsultationAnswerReviewProps {
  readonly step: ReviewStep;
  readonly intake: ConsultationIntake;
  readonly room: PreparedRoomAsset;
  readonly roomUrl: string;
  readonly generationActive: boolean;
  readonly onRevise: () => void;
}
```

Export `ConsultationAnswerReview`. Give it no intake mutation or image-upload callbacks.

Extend `ConsultationResultsProps` with `readonly briefLocked: boolean` and `readonly onChatBusyChange: (busy: boolean) => void`. Pass `generationActive` for the brief lock. Forward the callback through `ConsultationChatProps` as `onBusyChange: (busy: boolean) => void`; report submitted/streaming changes from an effect. Keep the workspace's callback stable and guarded by the current session epoch. Track `chatBusy` locally for reset-dialog copy only; it must not lock intake revision or product selection. Reset sets it false. Only brief revision is locked by analysis/preview; do not disable chat, product selection, or result reading.

For the new callback props, import `useCallback` from React and `UIMessage` from `ai`. Use the state-backed callback epoch below; do not read a mutable ref during render:

```tsx
const handleChatBusyChange = useCallback((value: boolean) => {
  if (sessionEpoch.current === callbackEpoch) setChatBusy(value);
}, [callbackEpoch]);
const handleMessagesChange = useCallback((messages: readonly UIMessage[]) => {
  if (sessionEpoch.current === callbackEpoch) session.setMessages(messages);
}, [callbackEpoch, session.setMessages]);
```

Use the same captured-epoch guard for the workspace's room-upload callback. On confirmed reset or explicit revision, run `sessionEpoch.current += 1` followed by `setCallbackEpoch(sessionEpoch.current)` inside the event handler. This invalidates old callbacks immediately and binds new callbacks on the next render. Do not advance it on Generate or review. This prevents old-draft callbacks after reset without claiming to fix replacement uploads within the same draft.

### Focus and mounted state

Use a stable design-area wrapper with `tabIndex={-1}`. Keep that wrapper through waiting, error, and results. Focus it after the explicit Generate or return action. Focus the review heading after an explicit step selection. Use a queued focus effect driven by those actions, not by network status.

Keep results inside the same wrapper when review is open:

```tsx
<section
  ref={designPanelRef}
  tabIndex={-1}
  aria-label="Design workspace"
  hidden={reviewStep !== null}
>
  {result ? (
    <ConsultationResults
      sessionId={session.state.id}
      csrfToken={handshake.csrfToken}
      refreshSession={handshake.refresh}
      intake={session.state.intake}
      result={result}
      room={session.state.room}
      roomUrl={session.roomUrl}
      preview={session.state.preview}
      previewUrl={session.previewUrl}
      selectedProductIds={session.state.selectedProductIds}
      initialMessages={session.state.messages}
      onSelectedProductIdsChange={session.setSelectedProductIds}
      onMessagesChange={handleMessagesChange}
      onRetryPreview={(productIds) => void renderPreview(result, productIds, 2)}
      onRevise={reviseBrief}
      briefLocked={generationActive}
      onChatBusyChange={handleChatBusyChange}
    />
  ) : session.state.room ? (
    <ConsultationGeneration
      intake={session.state.intake}
      room={session.state.room}
      roomUrl={session.roomUrl}
      busy={busy}
      error={requestError}
      onRetry={() => void analyze()}
      onRevise={reviseBrief}
    />
  ) : null}
</section>
```

Render this wrapper only when `hasDesignWorkspace` is true. Render the review beside it, not around it. Set a scoped `[hidden] { display: none; }` rule if a component display rule would otherwise override the native attribute. Hidden content must have no keyboard targets.

Keep a single global polite status announcement mounted outside the hidden wrapper. Existing preview alerts may remain inside results. Do not wrap the whole workspace in `aria-live` or `aria-busy`; that can suppress updates or read every answer.

## 4. Ordered implementation tasks

### Task 0: Development rate limits and production-safe test isolation

**Files:** Modify `src/lib/ai/security.ts`; create `tests/ai-security.test.ts` and `e2e/helpers/ai-consultation.ts`; update `e2e/ai-consultation.spec.ts` imports.

**Consumes:** The current `consumeWindow`, session handshake, signed cookie, CSRF, and `protectAiRequest` paths.

**Produces:** No application time-window throttling in development. Production enforcement remains unchanged. Consultation tests get independent network keys.

- [ ] Add unit tests using `vi.mock("server-only", () => ({}))`, `vi.stubEnv`, and `vi.resetModules()` between environment cases. Exercise exported handshake and request-protection functions, not a copied limiter implementation. Restore environment variables after each test.
- [ ] Construct valid same-origin requests with `Origin: http://127.0.0.1:3100`, a test `AI_SESSION_SECRET`, and matching `APP_ORIGIN`. Extract the signed cookie from each real handshake and read the returned CSRF token. In development, issue at least 21 new handshakes on one network and 61 protected requests on one valid session; expect success.
- [ ] In production, the sixth new handshake on one network must return 429. Test daily limits separately with fake time advanced outside hourly windows, plus a fresh session whose 61st protected request returns 429. Missing and `test` NODE_ENV values must not silently enable bypass. Also verify cross-origin, missing/incorrect CSRF, invalid cookie, and oversized requests remain rejected in development.
- [ ] Run `pnpm test tests/ai-security.test.ts` and confirm the development cases fail before implementation.
- [ ] Add one exact environment check at the beginning of `consumeWindow()`:

```ts
if (process.env.NODE_ENV === "development") {
  return { allowed: true, retryAfterSeconds: 0 };
}
```

Do not bypass `protectAiRequest()` or `createAiSessionHandshake()` wholesale. Do not add a client-controlled flag. Do not alter preview attempt guards or provider limits.

- [ ] Export the consultation Playwright test fixture from the helper file. Import it in both consultation specs instead of importing base `test` directly. The fixture sets a unique network key before navigation and real credential issuance:

```ts
import { randomUUID } from "node:crypto";
import { test as base } from "@playwright/test";

export const test = base.extend<{ aiNetworkIsolation: void }>({
  aiNetworkIsolation: [async ({ context }, use) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `e2e-${randomUUID()}` });
    await use();
  }, { auto: true }],
});
```

This relies on the current local server's existing network-key extraction. Verify that the test server receives the isolated header; if the server rewrites it, stop and correct the test fixture rather than adding a production bypass. Treat these synthetic identities as test infrastructure, not an endorsement of trusting arbitrary forwarded headers in deployment.

- [ ] Import `expect` and types from Playwright normally. In all later example tests, import `test` from `./helpers/ai-consultation`. Preserve any future shared headers when adding the fixture header.
- [ ] Run more than five consultation test contexts against the same server across both configured projects. Verify successful handshakes and retained real CSRF checks. The E2E build uses production behavior even though analysis is mocked.
- [ ] Run security and preview-guard unit tests. Suggested authorized commit: `test(ai): isolate browser sessions and disable dev throttling`.

### Task 1: Immediate generation feedback with safe request ownership

**Files:** Create `consultation-generation.tsx`; modify `consultation-workspace.tsx` and its CSS module. Create `e2e/helpers/ai-consultation.ts` and `e2e/ai-consultation-generation.spec.ts`; update helper imports in the existing spec.

**Consumes:** Existing intake, room asset, result, `busy`, preview state, session-recovery fetch.

**Produces:** The presentation interfaces above, immediate design-area feedback, one active analysis request, and guarded response handling.

- [ ] Extract `createTestJpeg()` from the existing spec without changing its implementation. Split its existing `buildRecommendations()` setup into exported `prepareConsultation(page: Page, roomImage: Buffer): Promise<void>` and `buildRecommendations(page: Page, roomImage: Buffer): Promise<void>`. Preparation stops at step 4; build calls preparation and clicks `Build recommendations`. Update the two existing tests to import these functions.
- [ ] Add a failing browser test that holds the actual mock analysis response. This uses the current mock provider rather than inventing a result fixture:

```tsx
import { expect } from "@playwright/test";
import { test, createTestJpeg, prepareConsultation } from "./helpers/ai-consultation";

test("shows generation feedback before analysis returns", async ({ page }) => {
  const image = await createTestJpeg(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let analysisRequests = 0;
  await page.route("**/api/ai/consultation", async (route) => {
    if (route.request().postDataJSON().action !== "analyze") {
      await route.continue();
      return;
    }
    analysisRequests += 1;
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.route("**/api/ai/consultation/preview", (route) => route.fulfill({
    status: 503,
    json: { error: "Image preview is unavailable because OpenRouter is not configured." },
  }));
  try {
    await prepareConsultation(page, image);
    await page.getByRole("button", { name: "Build recommendations", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Creating your room design" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Generating your design");
    await expect(page.getByLabel("Guided room intake")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start over", exact: true })).toBeEnabled();
    await expect.poll(() => analysisRequests).toBe(1);
  } finally {
    release();
  }
});
```

- [ ] Run `pnpm test:e2e e2e/ai-consultation-generation.spec.ts --project=desktop-chromium`. Expect the new generation heading assertion to fail before implementation. If the browser executable is missing, use the repo-supported `PLAYWRIGHT_CHROMIUM_PATH` environment variable or install the project Playwright browser. Do not change app code to address environment failures.
- [ ] Implement the generation view using the actual room image and `ROOM_OPTIONS`, `STYLE_OPTIONS`, and `BUDGET_OPTIONS`. Use Next Image with the prepared dimensions and existing blob URL. Do not create or persist another object URL.
- [ ] Give the generation view a stable `Creating your room design` heading, short analysis text, photo, and compact brief. Reuse existing CSS tokens and small button styles. An error replaces the waiting text with `Generation did not finish`, the existing error message, `Try again`, and `Revise brief`.
- [ ] Add a request ref for analysis, following the existing preview identity pattern. Guard duplicate starts synchronously, capture the intake and room before awaiting, and pass an abort signal:

```tsx
const activeAnalysis = useRef<ActivePreviewRequest | null>(null);

// At the start of analyze(), after the current validation:
if (activeAnalysis.current || session.state.preview.status === "rendering") return;
const requestState = { id: crypto.randomUUID(), controller: new AbortController() };
const submittedIntake = session.state.intake;
activeAnalysis.current = requestState;
setGenerationStarted(true);
setReviewStep(null);
setBusy(true);
setRequestError("");
```

- [ ] In the existing try block, convert the captured room blob. Check identity before sending. Use `submittedIntake` in the unchanged body and `requestState.controller.signal` in fetch options. Check identity again after `response.json()` and before `setResult()` or `renderPreview()`. Do not launch preview after an obsolete result.
- [ ] In catch, ignore superseded or explicitly abandoned analysis. Otherwise retain the current error behavior. In finally, clear the ref, deadline timer, and `busy` only when that request still owns the ref. Extend unmount cleanup to invalidate identities before aborting analysis and preview. Credential renewal is separately bounded and receives the caller's signal through Task 1A.
- [ ] Keep Start over enabled; Task 1A adds confirmation before destructive reset. Keep the revision handler guarded by `generationActive`. Do not introduce the earlier proposed reset lock.
- [ ] Run the new test and the existing consultation spec. Expect immediate feedback, one analysis request, and preserved preview retry/restore behavior. Task 1A updates the existing reset test for confirmation.
- [ ] Review the diff. Commit only task files if commits are authorized: `feat(ai): show immediate design generation feedback`.

### Task 1A: Confirmed Start over and bounded request recovery

**Files:** Create `consultation-reset-dialog.tsx`; modify workspace, results, session hook, CSS, `client-session.ts`, `consultation-storage.ts`, preview-route error copy, and the named security/session/storage/browser tests.

**Consumes:** Task 1 request identities and feedback. Current storage schema and preview attempt policy.

**Produces:** A safe escape from active or stalled work, without accidental deletion or stale result restoration.

#### A. Dialog behavior

- [ ] Add failing browser cases for Start over during analysis, preview rendering, chat streaming, and completed results. The dialog opens without aborting work. Keep working and Escape preserve input, result, and ongoing request counts. Confirm clears the design once and returns to step 1.
- [ ] Add a completion-while-dialog-open case. Release analysis/preview while the dialog is open. The dialog must remain open, keep focus inside it, and never confirm itself.
- [ ] Implement a native `<dialog>` with `showModal()`, labelled title and description, and explicit Keep working / Clear and start over buttons. Follow the native-dialog usage in `src/components/catalog/shop-filters.tsx`, but do not refactor that component. Use this interface:

```tsx
interface ConsultationResetDialogProps {
  readonly open: boolean;
  readonly activeWork: boolean;
  readonly onDismiss: () => void;
  readonly onConfirm: () => void;
}
```

Export `ConsultationResetDialog`. Capture `generationActive || chatBusy` as `activeWork` when opening the dialog, so completion does not remove or replace its copy unexpectedly. Default focus goes to Keep working. `onCancel` invokes `onDismiss`; close handling must not invoke destructive confirmation. Guard duplicate `showModal()` calls and repeated confirmation. Restore focus to Start over on dismissal and to the first intake heading after confirmed reset.

- [ ] Show the exact dialog copy from the spec. Do not say provider charges will stop. Confirm whenever a room, results, or active work exists; the untouched initial draft can reset directly. Keep a completion announcement outside the dialog from stealing focus.

#### B. Request ownership and deadlines

- [ ] Add unit tests to `tests/ai-session-client.test.ts` for an already-aborted request, abort after a 401 before renewal, abort during renewal, and no retried fetch after abandonment. Preserve the existing successful-renewal tests.
- [ ] Change the internal dependency signature to `readonly renew: (signal?: AbortSignal) => Promise<string>`. Obtain the effective request signal from `init.signal` or a Request input. Check it before sending, before renewal, and after renewal:

```ts
const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
signal?.throwIfAborted();
// After a 401, before renewal:
signal?.throwIfAborted();
const csrfToken = await dependencies.renew(signal ?? undefined);
signal?.throwIfAborted();
```

The retried fetch keeps the signal and renewed header. A credentials refresh must never silently retry an abandoned analysis.

- [ ] Make `useAiHandshake.refresh(signal?: AbortSignal): Promise<string>` use the supplied signal and a 20-second timeout for `requestAiSession`. Initial handshake also gets the timeout. Use a refresh request identity to prevent aborted/older refreshes from clearing newer credentials or displaying stale errors. Keep `refresh` stable with `useCallback` and return that callback directly. The chat caller can omit the optional signal. Do not let an obsolete canceled refresh clear a valid token from a newer request.
- [ ] Add request-owned deadlines in the workspace: analysis 120 seconds, preview delivery 210 seconds. Start before image conversion and include credential recovery. On deadline, verify identity, invalidate it, abort its controller, and immediately set the corresponding error state. Do not rely only on an awaited fetch rejecting to unlock the UI. Use `The room analysis took too long. Your answers are still available.` or the existing preview-timeout copy. Clear the timer on completion, failure, reset, and unmount. These values are initial engineering defaults, not measured ETAs.
- [ ] Recheck preview identity after awaiting a non-OK response body, before `failPreview`. Check aborted state too. Every post-await write in analysis and preview must belong to the current request. Add a delayed error-body case, not just a delayed response-header case.
- [ ] On confirmed reset, invalidate analysis/preview identities before calling their controllers' abort methods. Clear deadline timers and set `busy` false. Invalidate the workspace session epoch so old image/message callbacks from the discarded draft cannot update the new draft. Guard callbacks by their captured session epoch. Do not increment that epoch on ordinary review clicks. This reset isolation does not fix the deferred image-replacement race within the same submitted draft.
- [ ] Stop chat on true result disposal, not on hiding results for review. In `ConsultationChat`, add unmount cleanup for `stop` only if the installed SDK does not already guarantee it; verify behavior with the partial-stream reset test before relying on SDK defaults. Do not change the chat protocol.

#### C. Durable reset and quota truth

- [ ] Add a storage unit test that starts a save, immediately requests clear, awaits both, then expects `loadLatest()` to return null. Add another that queues save-old, clear, save-new and expects only the new record to be returned.
- [ ] Serialize writes inside each `createConsultationStorage()` instance with a small promise chain. Wrap the existing save and clear operation bodies, preserve their schema and errors, and let a rejected operation leave the queue usable:

```ts
let writes: Promise<void> = Promise.resolve();
function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  const next = writes.then(operation);
  writes = next.catch(() => undefined);
  return next;
}
```

`save()` and `clear()` return their `enqueueWrite` promise. `loadLatest()` waits for earlier writes before reading its pointer. This orders reset after already-started saves and before a newly edited draft's saves. It does not add cross-tab synchronization; cross-tab concurrent editing remains outside scope.

- [ ] Make `useConsultationSession.reset()` return `Promise<void>` and propagate clear failure after setting `persistenceError`. The workspace can unlock the new draft immediately, show `Clearing saved design…` while clearing, and handle failure with `The design was cleared from this page, but saved data could not be removed.` Do not show a successful durable-clear claim before the promise resolves. Prevent an old debounced record from enqueueing after reset by canceling pending persistence and checking its captured session epoch before save. Keep new-draft saves ordered after clear.
- [ ] Preserve the HTTP session cookie and preview guard. Correct the preview route's 409 copy to `This preview attempt is already used for this session. Your recommendations are still available.` Do not suggest Start over replenishes attempts. Add a server/unit-level guard check for reset-like new design signatures under the same signed-session key. UI tests that intercept preview are not sufficient evidence for this policy.
- [ ] Verify confirmed reset followed by reload after durable clearing does not restore the discarded room, result, or preview. Also verify a late analysis response, image error body, credential refresh, or chat chunk cannot restore it.
- [ ] Run unit tests and the targeted E2E suite red before fixes, then green. Suggested authorized commit: `feat(ai): confirm reset and bound generation recovery`.

### Task 2: Review completed answers without changing submitted inputs

**Files:** Create `consultation-answer-review.tsx`; modify workspace, results, generation module, CSS, and the generation spec.

**Consumes:** Task 1 generation state and interfaces; existing option lists and room asset.

**Produces:** Four read-only review views, clickable completed-step navigation, a persistent return action, and consistent brief-edit locking.

- [ ] Add a failing gated-analysis test using Task 1's route setup. Submit, then iterate over all four review buttons. Assert the correct answers and absence of editable controls inside the named review region:

```tsx
const navigation = page.getByRole("navigation", { name: "Review completed answers" });
await navigation.getByRole("button", { name: "Style and priorities", exact: true }).click();
const review = page.getByRole("region", { name: "Submitted answers" });
await expect(review.getByRole("heading", { name: "Style and priorities", exact: true })).toBeVisible();
await expect(review).toContainText("Soft modern");
await expect(review).toContainText("Conversation");
await expect(review).toContainText("Reading");
await expect(review.locator("input, textarea, select")).toHaveCount(0);
await expect(page.getByRole("button", { name: "Back to generation", exact: true })).toBeVisible();
await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeDisabled();
```

- [ ] Run the targeted test. Expect the missing navigation/region assertion to fail.
- [ ] Render four genuine buttons after submission, using the first four `INTAKE_STEPS` labels. Give the navigation `aria-label="Review completed answers"`; use `aria-current="step"` on the selected review button. Keep progress completion distinct from the selected review. Do not expose step 5 as a completed answer.
- [ ] Keep the existing timeline before submission. In review mode, replace its non-interactive items with the review navigation rather than adding a second competing timeline. On mobile, use a two-column button layout; do not hide review navigation below 40rem.
- [ ] Implement semantic `<dl>` summaries for every answer. Map options from the existing constants. For exact measurements, include width, length, and ceiling in feet. For presets, identify the size as an assumption and show its preset dimensions. Include all priorities. Render notes with preserved line breaks and `overflow-wrap: anywhere`; use `No additional notes` when empty.
- [ ] Render the actual prepared room image and filename in step 1. Do not offer upload/replace controls in review. Keep fields high-contrast rather than styling the whole summary as disabled.
- [ ] Include `Revise brief` in the review view. Disable it with the provided explanation while generation is active. When enabled, call the workspace revision helper. Analysis-failure revision returns to step 4; ordinary Back remains available to edit earlier steps.
- [ ] Add `briefLocked` to the results props. Set `disabled={briefLocked}` on its existing `Revise brief` button. Link the button to the generation restriction text when locked. Keep all other result actions unchanged.
- [ ] Implement compact status text from the spec. Keep the status sticky only within the design page, below `var(--site-header-height)`. During review, show `Back to generation` without a result, or `View design` with a result. Hide the return action in the design view itself.
- [ ] Use a wrapper for sticky status and a child text node with `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`. Keep the return button outside the live region. The status text must remain available even if the design area is hidden.
- [ ] Run the targeted tests on both configured projects. Verify that opening and closing review does not increase analysis or preview request counts.
- [ ] Review the diff. Suggested authorized commit: `feat(ai): let users review submitted answers during generation`.

### Task 3: Preserve review, focus, and chat when results arrive

**Files:** Modify workspace, generation module, CSS, and generation spec.

**Consumes:** Task 2 read-only review and status components.

**Produces:** Independent review navigation, stable focus, and mounted results across review switches.

- [ ] Add a failing completion-during-review test. Hold analysis and preview separately with promises. Finish analysis while step 3 is open, then finish preview. Use these assertions after each gate release:

```tsx
const review = page.getByRole("region", { name: "Submitted answers" });
const heading = review.getByRole("heading", { name: "Style and priorities", exact: true });
await expect(heading).toBeVisible();
await expect(heading).toBeFocused();
await expect(page.getByRole("button", { name: "View design", exact: true })).toBeVisible();
await expect(page.getByRole("region", { name: "Design workspace" })).toBeHidden();
// After releasing the preview gate:
await expect(page.getByRole("status")).toContainText("Your design is ready");
await expect(heading).toBeVisible();
await expect(heading).toBeFocused();
await page.getByRole("button", { name: "View design", exact: true }).click();
await expect(page.getByRole("heading", { name: "Catalog recommendations" })).toBeVisible();
```

- [ ] Add a separate draft-preservation test after successful recommendations. Fill the chat textarea with `Keep this draft while I review the room`. Open step 1, return through `View design`, and assert the textarea still has that exact value. Check that a previously changed product selection also remains unchanged.
- [ ] Run the new tests and confirm failures if Task 2 switches away from review or unmounts results.
- [ ] Keep `ConsultationResults` mounted under a stable hidden design wrapper while review is open. Do not put it inside a conditional branch that replaces it with the review component. Do not change keys based on `reviewStep`, preview status, or request status.
- [ ] Queue focus only from explicit user actions. Use a local ref containing `"design" | "review" | null`, and an effect after the view change to focus the stable design wrapper or review heading. Clear the ref after focusing. Do not set this ref in response handlers.

```tsx
const pendingFocus = useRef<"design" | "review" | null>(null);
const designPanelRef = useRef<HTMLElement>(null);
const reviewPanelRef = useRef<HTMLElement>(null);

function openReview(step: ReviewStep) {
  pendingFocus.current = "review";
  setReviewStep(step);
}
function returnToDesign() {
  pendingFocus.current = "design";
  setReviewStep(null);
}
```

- [ ] Put the review ref on a stable review wrapper. Give its heading `tabIndex={-1}`. Complete the focus handling with this effect:

```tsx
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
```

If a user selects the already-open step, focus its existing heading directly and return before queuing focus. Set pending design focus on accepted Generate. When retrying from a mounted error view, focus the design wrapper directly because `generationStarted` is already true. Network completion must never queue focus or scrolling.
- [ ] Add `scroll-margin-top` to the design wrapper and review heading so keyboard focus stays below the header/status. Do not force a scroll to results when analysis completes during review.
- [ ] Keep a pending-chat-response test using a gated `route.fetch()` response, but label its coverage accurately: outstanding-request continuity, not partial streaming.
- [ ] Add a distinct partial-stream test using `e2e/helpers/consultation-stream.ts`. The fixture must deliver a real first chunk before waiting for release. Use the installed AI SDK stream helpers and a test-only loopback HTTP server, then a narrowly scoped browser fetch adapter for `action: "chat"`; restore it after each test. Analysis and session requests must retain their real path. Do not use `route.fulfill()` with a fully buffered response as evidence of progressive delivery. Verify the exact installed SDK APIs before writing the fixture; reuse the mock route's event types rather than inventing protocol events.
- [ ] In that test, observe partial assistant text and the active Stop control before opening review. Deliver the remaining chunk while hidden. Return to results and assert complete assistant text, a single message identity, the user's message, and exactly one chat request. Add reset-during-stream coverage that proves old chunks cannot appear in the new draft. Use explicit gates with cleanup, not timing sleeps.
- [ ] Verify hidden results are absent from tab order and accessibility navigation. Verify the draft, messages, and selected products remain intact on return.
- [ ] Run all consultation tests on desktop and mobile. Suggested authorized commit: `fix(ai): preserve review and chat across generation updates`.

### Task 4: Failure, retry, restore, and request-race checks

**Files:** Modify generation spec and only the production files where these cases expose a defect.

**Consumes:** Tasks 1–3 request guard and independent review state.

**Produces:** Verified recovery with no stale result writes or extra requests.

- [ ] Add gated analysis-error coverage. Return a 500 JSON error while review is open. Assert review stays selected, the compact status reports failure, and the return action opens an error view with `Try again`. Then allow a real mock analysis response on retry and assert one new analysis request and one initial preview attempt.

```tsx
await expect(page.getByRole("status")).toContainText("Generation did not finish");
await expect(page.getByRole("region", { name: "Submitted answers" })).toBeVisible();
await page.getByRole("button", { name: "Back to generation", exact: true }).click();
await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeEnabled();
await expect(page.getByRole("button", { name: "Revise brief", exact: true })).toBeEnabled();
```

- [ ] Add preview-error coverage while reviewing step 4. Return 429 with the existing retry message. Assert answers remain visible and the status says recommendations remain available. Return to results and verify `Try one more render`, recommendations, and the enabled chat textarea. Preserve the two-attempt limit.
- [ ] Add preview-unavailable coverage using 503 with the existing configured-provider error. Assert no false `Your design is ready` announcement and no new unsupported retry behavior.
- [ ] Add a rapid-submission check with a held analysis route. Dispatch two synchronous clicks from the original submit element and assert only one analysis request:

```tsx
await page.getByRole("button", { name: "Build recommendations", exact: true }).evaluate((button) => {
  (button as HTMLButtonElement).click();
  (button as HTMLButtonElement).click();
});
await expect.poll(() => analysisRequests).toBe(1);
```

- [ ] Add a navigation-away check. Hold analysis, navigate to `/shop`, then release the held response. Return to `/ai-consultation`. Assert no old analysis result or preview request appears and the saved intake remains available. Release gates in `finally`; avoid arbitrary sleeps. This verifies ignored obsolete work, not server-side cancellation guarantees.
- [ ] Add a 401 recovery check. Intercept the first analysis request with 401; let the second use `route.fetch()` and hold it. Assert feedback remains visible across handshake renewal, then release it. Expect exactly two HTTP attempts but one generation cycle and one preview attempt.
- [ ] Extend restore checks: reload completed results after opening review and expect results, not persisted review. Poll IndexedDB until the expected preview attempt and rendering state are durable before reloading. Test attempt 1 and attempt 2 separately. Attempt 1 restores an error with the existing one remaining retry; attempt 2 restores an error without offering or promising another render. In `restoreSession()`, use `The previous image render was interrupted. No preview attempts remain for this session.` for attempt 2. Preserve recommendations and do not restart requests automatically.
- [ ] Verify confirmed reset and revision after terminal states clear local review state and status. Reset returns to step 1; revision returns to editable step 4. Update the original consultation E2E reset test to confirm `Clear and start over` before expecting step 1. Keep the storage schema and retention period unchanged.
- [ ] Run the new tests red before fixes. Fix only defects in the planned request guards, navigation, or feedback. Do not change the storage schema or server request protocol.
- [ ] Run `pnpm test:e2e e2e/ai-consultation.spec.ts e2e/ai-consultation-generation.spec.ts`. Suggested authorized commit: `test(ai): cover generation recovery and request races`.

### Task 5: Accessibility, responsive checks, and final regression gate

**Files:** Modify the generation spec and workspace CSS as needed. No unrelated visual changes.

**Consumes:** The completed generation and review flow.

**Produces:** Verified keyboard, mobile, reduced-motion, and full regression evidence.

- [ ] Add an Axe check for held generation, answer review, and results-ready-during-review. Follow the existing `@axe-core/playwright` pattern:

```tsx
import AxeBuilder from "@axe-core/playwright";

const report = await new AxeBuilder({ page }).analyze();
expect(report.violations.filter(({ impact }) =>
  impact === "serious" || impact === "critical",
)).toEqual([]);
```

- [ ] Add keyboard assertions. Focus a completed-step button, press Enter, and expect the review heading to receive focus. Press Tab through review/return actions and confirm hidden result controls are skipped. Verify a background completion does not change focus.
- [ ] Add a 320px viewport check with long filename and maximum-length notes. Verify all four review buttons remain reachable and the page has no horizontal overflow:

```tsx
await page.setViewportSize({ width: 320, height: 740 });
expect(await page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth,
)).toBe(true);
```

- [ ] Add a scrolled-answer stability test at 320px. Use maximum-length notes, open step 4, scroll to a visible sentence, and capture both `scrollY` and that element's viewport position. Release analysis and preview separately without clicking. Compare positions within a small rendering tolerance and assert focus is unchanged:

```tsx
const anchor = page.getByRole("region", { name: "Submitted answers" }).locator("dd").last();
const before = await anchor.evaluate((node) => ({ top: node.getBoundingClientRect().top, scrollY }));
// Release one response gate and wait for its named generation status.
const after = await anchor.evaluate((node) => ({ top: node.getBoundingClientRect().top, scrollY }));
expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(2);
expect(Math.abs(after.scrollY - before.scrollY)).toBeLessThanOrEqual(2);
```

Reserve a stable status area across supported messages if wrapping changes its height. Verify at 200% browser zoom too. Do not fix layout shifts by forcibly scrolling the user back after each network update.
- [ ] Add reduced-motion coverage with `page.emulateMedia({ reducedMotion: "reduce" })`. New waiting animation, if used, must be absent. Status text must remain visible and understandable without motion.
- [ ] Inspect desktop and mobile in one browser pass. Check the actual room photo, all four answer views, short/long notes, sticky status, success, and failure. Check header overlap and focus visibility at 200% zoom. The existing desktop accept panel also uses sticky positioning; keep it below the status or make it static only inside the generation workspace if overlap occurs.
- [ ] Fix findings in one bounded batch. Confirm those fixes in one further pass. Do not expand into a general page redesign.
- [ ] Run final commands from the project root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e

git diff --check
git status --short
```

`pnpm test:e2e` performs the production-style `.next-e2e` build and runs both configured browser projects. Do not claim a passing build or test suite without fresh command output. Report environment blockers and unrelated baseline failures separately.

- [ ] Confirm the production diff excludes the prototype, `assets/`, image provider code, and storage schema changes. Permit only the scoped security, request lifecycle, persistence-ordering, and recovery-copy edits listed in the file map. Stage explicit paths only. Suggested authorized commit: `test(ai): verify accessible generation review flow`.

## 5. Required scenario matrix

| Scenario | Required assertions | Layer |
| --- | --- | --- |
| Development traffic exceeds local limits | 21 handshakes and 61 valid requests succeed; origin/CSRF/size guards still reject invalid requests | Vitest |
| Production and default environments | Hourly/daily/request limits remain enforced; no bypass from mock-provider selection alone | Vitest |
| Expanded E2E suite | More than five contexts succeed with independent network keys and real cookies | Playwright |
| Review all four steps | Real stored labels, full notes, measured ceiling, preset assumption, actual photo; no editable inputs | Playwright |
| Analysis/image completion during review | Same view, focus, scroll offset, and visible answer position | Playwright |
| Buffered chat and partial stream | Distinct tests; partial text arrives before review, remaining text arrives while hidden | Playwright |
| Reset dismissed | No request abort, data loss, view switch, or quota change | Playwright |
| Reset confirmed during analysis/preview/chat | New blank draft; late writes ignored; no old state restored on reload | Playwright and storage unit tests |
| Completion while reset dialog is open | Dialog remains open; focus stays trapped; no automatic destructive action | Playwright |
| Analysis/preview/handshake deadline | Terminal feedback appears without provider acknowledgement; no stale updates afterward | Fake-timer unit checks and browser-clock checks |
| 401 and expired cookie | New valid credentials from real handshake; one retry; abort during renewal causes no stale retry | Unit and Playwright |
| Preview restore attempt 1 vs 2 | Wait for durable state; truthful remaining-attempt copy; no automatic render | Playwright |
| Quota after Start over | New local draft does not reset signed-session attempts; accurate 409 message | Server/guard unit check |
| Delayed preview error body | No obsolete error overwrites reset/new request | Streamed browser fixture |
| Storage save/clear failure | Queue ordering, truthful clearing status/error, new draft still usable | Unit and Playwright |
| Navigate to Project Edit during rendering | Selected products saved; page leaves normally; no promise that preview continues | Playwright |
| Rapid Generate | One request owner despite two synchronous clicks | Playwright |
| Pending image replacement within one draft | Accepted deferred race, not part of passing guarantees | Explicit skipped regression |

Add the deferred case with a visible reason rather than making a weak passing assertion:

```tsx
test.skip("pending image replacement can finish after generation starts", async () => {
  // Accepted deferral: upload A, hold replacement B, submit A, then finish B.
  // Required future fix: review/session/request must use the same submitted image.
});
```

Do not count that skipped case as covered. Reset-after-discard isolation remains required despite this deferral.

For deadline browser tests, install the Playwright clock before starting generation, allow normal setup first, and fast-forward only the owned deadline. Hold responses with explicit gates. For an actually expired signed cookie, use a correctly signed expired fixture cookie with the configured test secret, or advance server time in a controlled test seam. A synthetic 401 with an otherwise valid cookie tests the retry branch only, not expiry or credential rotation.

## 6. Test execution notes

- New browser tests use deterministic response gates, not real AI services or arbitrary wait durations.
- Intercept preview requests in every new generation test to avoid outbound provider calls.
- The configured mock analysis still passes through server validation and catalog recommendation generation. Use `route.fetch()` once per intercepted mock analysis response.
- Every held request must have a release in `finally`, including tests with two gates. Do not leave pending route handlers after a failed assertion.
- Scope locators to the named navigation, review region, design workspace, or status. Several step labels also appear as headings.
- Do not add React Testing Library or another DOM runner. This behavior crosses requests, mounting, focus, and browser storage; use the existing Playwright setup.
- Vitest covers the development limiter, production security, abort-aware session recovery, storage ordering, and existing preview guards. Browser tests cover the UI and request lifecycle. Do not use a new unit-test abstraction merely to mirror view state.
- Before execution, capture baseline results for `pnpm typecheck`, `pnpm test`, and the existing consultation E2E spec. Record unrelated failures rather than silently fixing them.

## 7. Acceptance checklist

- [ ] Generate produces immediate visible feedback before the response arrives.
- [ ] Waiting uses real request states, not simulated progress.
- [ ] Every answer and actual room image can be reviewed under the normal completed-upload flow. The deferred replacement race is explicitly recorded.
- [ ] Review cannot mutate the intake or issue another analysis request.
- [ ] Review is available at 320px and through the keyboard.
- [ ] Review completion changes the status, not the selected view, focus, or scroll.
- [ ] Returning to results preserves draft chat, in-flight chat, messages, and product selections. Confirmed reset is deliberate disposal, not review navigation.
- [ ] Recommendations remain usable while preview generation runs.
- [ ] Start over stays available and asks before discarding work. Confirmed reset invalidates old work; dismissing it changes nothing.
- [ ] Brief revision stays disabled during generation; timeout and reset recovery remain usable.
- [ ] Development bypasses time-based limits only. Production enforces limits, origin, CSRF, and signed-session protection.
- [ ] Browser tests use isolated identities without disabling production protections.
- [ ] Partial-stream and visible-answer-position checks pass, not just buffered-response and focus checks.
- [ ] Analysis failure retains answers and supports retry or explicit revision.
- [ ] Preview failure retains recommendations, chat, and existing retry limits.
- [ ] Superseded or unmounted analysis cannot write results or launch preview.
- [ ] Restored sessions do not claim a request is still running or restore temporary review navigation.
- [ ] No API, storage schema, retention, or provider changes.
- [ ] No prototype controls, sample answers, or simulated timers in production.
- [ ] Fresh verification output supports the final handoff.

## 8. Execution and handoff

Run tasks sequentially. They touch the same workspace and depend on its state contract. Independent review can follow each task, but parallel implementation would risk conflicting state and test changes.

At each review boundary, report changed files, passing checks, and any deviation from this plan. The recommended confirmed Start over flow is the sole planned destructive-abandonment control. Ask before adding a separate Cancel action, production background jobs, or production streaming endpoints.

The approved prototype remains an untracked local reference. Do not commit it with production code. After production validation, offer to archive it on a throwaway branch. Do not move or delete it as part of implementation without agreement.

Planning self-review: required behavior maps to Tasks 0, 1, 1A, and 2–5. The review corrections expand scope into development security, reset lifecycle, and tests without changing API payloads or storage schemas. The pending-image-replacement race is accepted and deferred, not solved. Start over confirmation and internal recovery ceilings are recommendations for this revision. No build, test, or runtime behavior is claimed verified by this planning update.
