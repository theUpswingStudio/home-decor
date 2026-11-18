# Generation with answer review

## Approved direction

The user approved option 2, a dedicated generation view, with completed steps available for read-only review. They approved the interaction prototype, then requested a detailed implementation plan. Production implementation is not yet authorized by this planning task.

Reference prototype: `src/components/ai-consultation/generation-review.prototype.html`.

The prototype is an interaction reference, not production code. Its sample answers, sample results, fonts, timers, and debug controls must not enter the live flow. The prototype is currently untracked. Keep it separate from production changes and preserve it until the user decides how to archive it.

## Review decisions

After the adversarial review, the user requested these plan revisions:

- Disable time-based rate limits for local development. Keep production protection active.
- Defer the pending-image-replacement race for now. Record the limitation; do not claim it is fixed.
- Recommend suitable Start over behavior and include it in the revised plan.
- Strengthen tests, including streaming, scroll preservation, and recovery.

The Start over design below is the recommended revision for review, not a claim of separate user approval. It replaces the earlier proposed reset lock. No production implementation is authorized by this document update.

## Goal

After submitting a room brief, users immediately see that generation started. They can inspect their submitted answers without changing them or interrupting generation.

## Required behavior

1. Preserve the existing four intake steps and their validation.
2. After a valid submission, replace the editable intake with a dedicated generation view before awaiting image conversion or network work.
3. Display the actual submitted room photo and a compact room brief.
4. Make all four completed steps accessible for read-only review.
5. Keep a compact generation status visible during review, with a return action.
6. Show complete recommendations as soon as the existing analysis request succeeds. Keep image generation independent.
7. If results arrive during answer review, keep the selected review open. Announce availability and offer `View design`.
8. Keep recommendations, product selection, and chat usable while the image renders.
9. Keep intake controls read-only during analysis and image rendering. Do not add a separate Cancel generation action. The accepted pending-image-replacement limitation below remains.
10. Preserve answers after analysis failure. Offer retry and a route back to editing.
11. Preserve recommendations and chat after image failure. Keep existing preview retry limits and unavailable-provider behavior.
12. Preserve the storage schema and retention policy. Do not persist temporary review navigation or a fictitious running job.
13. Keep Start over available. Confirm destructive reset when a room, generated result, or active request exists.
14. Confirmed reset invalidates old client work, clears the local design, and returns to step 1. Late results must not restore it.
15. Apply bounded failure recovery to analysis, preview delivery, and credential renewal. Deadlines are internal recovery limits, not user-facing estimates.

## Production interpretations

These decisions fill gaps between the prototype and the current application. They are implementation proposals, not additional approved product features.

- Keep the current submit label, `Build recommendations`. The request concerns feedback, not a naming change.
- Review displays readable answer summaries, not disabled copies of the editable form.
- Keep answer review available after generation. Use `Revise brief` to return to the editable intake.
- Keep `Start over` enabled during generation. Use a confirmation dialog to prevent accidental loss. Do not abort anything until confirmation.
- Keep `Revise brief` disabled during analysis and preview rendering. Users can review answers or choose Start over instead.
- If only an untouched empty draft exists, Start over needs no confirmation. A room image, result, or active generation/chat request requires confirmation.
- Existing product selection remains editable during image rendering. It does not change the submitted room brief or the in-flight preview selection.
- Initial intake navigation retains its existing behavior. Completed-step review becomes available only after submission or restored results.
- Keep the results component mounted while reviewing answers. Hide it visually and from keyboard access, so chat state survives.
- Do not promise that requests continue after leaving the page or refreshing it. This change supports navigation between steps on the same page.

## Start over recommendation

Use one existing action rather than adding pause, cancel, and restart controls. Start over means discard the current design and begin a blank brief. It does not mean regenerate with the same answers.

During active work, open a native modal dialog:

- Title: `Start over?`
- Body: `This clears your room photo, answers, and design from this browser. Work already sent to the provider may continue.`
- Secondary action: `Keep working`, focused by default.
- Destructive action: `Clear and start over`.

After completion, use the same dialog without the provider-work sentence. Escape closes it without changes. Keep working returns focus to Start over. The dialog stays open if generation completes behind it; neither completion nor an error can confirm reset for the user.

On confirmation, invalidate analysis and preview requests before aborting them, stop chat, clear transient view/error state, and clear the saved design. Return focus to the first intake heading. Failed storage clearing must produce a truthful warning, not a claim that all saved data is gone. Ignore old callbacks after reset. Do not wait for a provider acknowledgement to unlock the new brief.

Aborting a browser request does not guarantee that provider computation or charges stop. Start over does not rotate the signed AI session or reset preview attempts. Preview allowance remains one automatic attempt and one retry per current signed session. A rejected attempt must explain the limit without instructing the user to Start over to bypass it.

## Development limits and tests

Bypass the time-window limiter only when `NODE_ENV === "development"`. Keep origin checks, signed cookies, CSRF, input limits, and preview attempt deduplication active. Missing, test, staging, and production environment values do not enable the bypass. External provider rate limits and charges remain outside this application's control.

The existing Playwright server runs a production build. It must retain production rate limiting. Give consultation tests separate synthetic network identities in the test fixture instead of adding a production bypass switch. Test development bypass and production enforcement separately with Vitest.

## Accepted limitation

Image preparation can finish after a user leaves the first step. If they submit an older image during replacement, the late callback can still change current session data. The user accepted deferring this race. Keep it out of this implementation, record a skipped regression scenario with the exact sequence, and do not describe all submitted data as immutable under every timing condition.

This deferral does not permit old callbacks to restore a design after confirmed Start over. Reset must isolate old session work from the new draft.

## Content and states

| Actual state | Visible status | Review return action |
| --- | --- | --- |
| Analysis running | Generating your design… | Back to generation |
| Recommendations ready, image running | Your recommendations are ready. Your room preview is still generating. | View design |
| Image ready | Your design is ready | View design |
| Analysis failed | Generation did not finish. Your answers are unchanged. | Back to generation |
| Image failed | Your preview did not finish. Your recommendations are still available. | View design |
| Image unavailable | Preview unavailable. Your recommendations are still available. | View design |
| Results restored without an image request | Your recommendations are ready | View design |

During generation, show: `You can review your answers while we generate your design. Editing is unavailable until generation finishes.`

After generation, show: `These are your submitted answers. Choose Revise brief to make changes.`

Do not add percentages, estimated completion times, invented stages, token streaming, or intermediate image previews.

## Answer coverage

- Room and reference: room label, filename, actual image.
- Set room size: measured versus assumed size; exact width, length, and ceiling when supplied; named preset and assumed dimensions otherwise.
- Style and priorities: chosen style and every selected priority.
- Set investment: chosen budget and full additional notes. State `No additional notes` when empty.

Use existing option labels and actual stored answers. Never substitute prototype values.

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

## Acceptance

The change succeeds when users can submit, inspect answers, and return to results without duplicate analysis requests or lost chat state. The pending-image-replacement race remains an explicit exception. Completion and failure must not close review, move focus, or shift the answer being read. Confirmed Start over must clear current work safely; dismissing it must leave work unchanged. Desktop, mobile, keyboard, reduced-motion, partial-stream, reset, timeout, development-limit, and production-limit checks must pass before handoff.
