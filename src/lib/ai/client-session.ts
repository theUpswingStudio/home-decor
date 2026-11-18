type FetchImplementation = typeof fetch;

interface SessionRecoveryDependencies {
  readonly fetch?: FetchImplementation;
  readonly renew: (signal?: AbortSignal) => Promise<string>;
}

export async function fetchWithAiSessionRecovery(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  dependencies: SessionRecoveryDependencies,
): Promise<Response> {
  const request = dependencies.fetch ?? fetch;
  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  signal?.throwIfAborted();
  const retryInput = input instanceof Request ? input.clone() : input;
  const response = await request(input, init);
  if (response.status !== 401) return response;

  signal?.throwIfAborted();
  const csrfToken = await dependencies.renew(signal ?? undefined);
  signal?.throwIfAborted();
  const headers = new Headers(
    init?.headers ?? (retryInput instanceof Request ? retryInput.headers : undefined),
  );
  headers.set("x-ai-csrf", csrfToken);
  return request(retryInput, { ...init, headers });
}
