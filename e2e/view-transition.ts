import { expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    __viewTransitionRecords?: Array<{
      finished: boolean;
      pseudoElements: string[];
      ready: boolean;
      rejected: boolean;
    }>;
  }
}

export async function instrumentViewTransitions(page: Page) {
  await page.addInitScript(() => {
    window.__viewTransitionRecords = [];
    if (typeof document.startViewTransition !== "function") return;

    const startViewTransition = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      const record = {
        finished: false,
        pseudoElements: [] as string[],
        ready: false,
        rejected: false,
      };
      window.__viewTransitionRecords?.push(record);
      const transition = startViewTransition(...args);
      void transition.ready.then(
        () => {
          record.pseudoElements = document.documentElement
            .getAnimations({ subtree: true })
            .map(
              (animation) =>
                (animation.effect as (KeyframeEffect & {
                  pseudoElement?: string | null;
                }) | null)?.pseudoElement,
            )
            .filter((value): value is string => Boolean(value));
          record.ready = true;
        },
        () => {
          record.rejected = true;
        },
      );
      void transition.finished.then(() => {
        record.finished = true;
      });
      return transition;
    };
  });
}

export async function getViewTransitionBaseline(page: Page) {
  return page.evaluate(() => window.__viewTransitionRecords?.length ?? 0);
}

export async function expectViewTransitionActivation(
  page: Page,
  baseline: number,
  sharedMediaName: string,
) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ startIndex, mediaName }) =>
          (window.__viewTransitionRecords ?? [])
            .slice(startIndex)
            .some(
              (record) =>
                record.ready &&
                record.finished &&
                !record.rejected &&
                record.pseudoElements.some((pseudoElement) =>
                  pseudoElement.includes(`(${mediaName})`),
                ),
            ),
        { startIndex: baseline, mediaName: sharedMediaName },
      ),
    )
    .toBe(true);
}
