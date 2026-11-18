import { expect } from "@playwright/test";
import { test } from "./helpers/ai-consultation";

test.use({ extraHTTPHeaders: { "x-e2e-shared": "preserved" } });

test("isolates network limits and retains real CSRF checks", async ({ page, context }) => {
  await page.goto("/");
  let csrfToken = "";
  const cookies = new Set<string>();

  for (let index = 0; index < 5; index += 1) {
    await context.clearCookies();
    const sent = page.waitForRequest("**/api/ai/session");
    const handshake = await page.evaluate(async () => {
      const response = await fetch("/api/ai/session", { method: "POST" });
      return { status: response.status, body: await response.json() };
    });
    const headers = await (await sent).allHeaders();
    expect(headers["x-forwarded-for"]).toMatch(/^e2e-/);
    expect(headers["x-e2e-shared"]).toBe("preserved");
    expect(handshake.status).toBe(200);
    csrfToken = handshake.body.csrfToken;
    expect(csrfToken).toBeTruthy();
    const cookie = (await context.cookies()).find(({ name }) => name === "vestrel-ai-session");
    expect(cookie).toBeDefined();
    cookies.add(cookie!.value);
  }
  expect(cookies.size).toBe(5);

  // A valid token reaches body validation; missing and incorrect tokens do not.
  for (const token of [undefined, "incorrect", csrfToken]) {
    const status = await page.evaluate(async (csrf) => {
      const response = await fetch("/api/ai/consultation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(csrf ? { "x-ai-csrf": csrf } : {}),
        },
        body: JSON.stringify({}),
      });
      return response.status;
    }, token);
    expect(status).toBe(token === csrfToken ? 400 : 401);
  }

  await context.clearCookies();
  const blocked = await page.evaluate(async () => {
    const response = await fetch("/api/ai/session", { method: "POST" });
    return { status: response.status, retryAfter: response.headers.get("retry-after") };
  });
  expect(blocked.status).toBe(429);
  expect(Number(blocked.retryAfter)).toBeGreaterThan(0);
});
