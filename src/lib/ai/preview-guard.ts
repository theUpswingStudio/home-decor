import "server-only";

import type { ImageRenderResult } from "./image-runtime";

const ENTRY_TTL_MS = 2 * 60 * 60 * 1000;

interface AttemptEntry {
  readonly key: string;
  readonly createdAt: number;
  readonly promise: Promise<ImageRenderResult>;
}

const attemptsBySession = new Map<string, Map<1 | 2, AttemptEntry>>();

export class PreviewAttemptError extends Error {
  constructor() {
    super("This preview attempt was already used for another selection.");
    this.name = "PreviewAttemptError";
  }
}

function deleteExpiredEntries(now: number): void {
  for (const [sessionId, attempts] of attemptsBySession) {
    for (const [attempt, entry] of attempts) {
      if (now - entry.createdAt > ENTRY_TTL_MS) attempts.delete(attempt);
    }
    if (attempts.size === 0) attemptsBySession.delete(sessionId);
  }
}

export function runGuardedPreview(
  sessionId: string,
  attempt: 1 | 2,
  signature: string,
  render: () => Promise<ImageRenderResult>,
): Promise<ImageRenderResult> {
  const now = Date.now();
  deleteExpiredEntries(now);
  const attempts = attemptsBySession.get(sessionId) ?? new Map<1 | 2, AttemptEntry>();
  attemptsBySession.set(sessionId, attempts);

  const key = `${signature}:${attempt}`;
  const existing = attempts.get(attempt);
  if (existing) {
    if (existing.key !== key) throw new PreviewAttemptError();
    return existing.promise;
  }

  const promise = render();
  attempts.set(attempt, { key, createdAt: now, promise });
  return promise;
}

export function resetPreviewGuardForTests(): void {
  attemptsBySession.clear();
}
