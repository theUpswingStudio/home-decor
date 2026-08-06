import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { ZodError } from "zod";
import { analyzeRoom, buildChatSystemPrompt } from "@/lib/ai/consultation";
import { analyzeRequestSchema, chatRequestSchema } from "@/lib/ai/consultation-schema";
import { getAiProviderOptions, getAiRuntime } from "@/lib/ai/model";
import { protectAiRequest } from "@/lib/ai/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Review the room details and try again.", fields: error.flatten().fieldErrors },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: "The request body is not valid JSON." }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "";
  const isConfigurationError = /AI_PROVIDER|OPENROUTER_API_KEY|AI_SESSION_SECRET/.test(message);
  return Response.json(
    {
      error: isConfigurationError
        ? "The design assistant is not configured on this environment."
        : "The design assistant could not complete this request. Check the local model connection and try again.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

function lastUserText(messages: readonly UIMessage[]): string {
  const message = messages.findLast((candidate) => candidate.role === "user");
  return message?.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join(" ") ?? "";
}

function mockChatResponse(messages: readonly UIMessage[]): Response {
  const question = lastUserText(messages).toLowerCase();
  let answer = "These pieces form a useful first edit. The anchor establishes scale, while the supporting pieces add contrast and keep the room flexible.";
  if (question.includes("price") || question.includes("cost")) {
    answer = "The prices shown on each recommendation are the current demonstration catalog prices. Project Edit keeps those selections together for a consultant to review.";
  } else if (question.includes("fit") || question.includes("size")) {
    answer = "The current size check uses your chosen room measurements or planning assumption. Confirm wall lengths, doorways, and circulation with a consultant before final approval.";
  } else if (question.includes("color") || question.includes("finish")) {
    answer = "The proposed finishes repeat the room's warm undertone, then add one darker note for definition. A physical finish sample should settle the final choice.";
  }
  const textId = crypto.randomUUID();
  const stream = createUIMessageStream({
    originalMessages: [...messages],
    execute({ writer }) {
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: answer });
      writer.write({ type: "text-end", id: textId });
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const protection = protectAiRequest(request);
  if (protection instanceof Response) return protection;

  try {
    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("action" in body)) {
      return Response.json({ error: "Select a valid design action." }, { status: 400 });
    }

    if (body.action === "analyze") {
      const parsed = analyzeRequestSchema.parse(body);
      const result = await analyzeRoom(parsed.intake, parsed.imageDataUrl, request.signal);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "chat") {
      const parsed = chatRequestSchema.parse(body);
      const messages = await validateUIMessages({ messages: parsed.messages });
      const runtime = getAiRuntime();
      if (runtime.mode === "mock") return mockChatResponse(messages);

      const result = streamText({
        model: runtime.model,
        system: buildChatSystemPrompt(
          parsed.intake,
          parsed.context.analysis,
          parsed.context.recommendations,
        ),
        messages: await convertToModelMessages(messages),
        providerOptions: getAiProviderOptions(runtime),
        abortSignal: request.signal,
        maxRetries: 1,
        ...(runtime.label === "local-proxy" ? {} : { maxOutputTokens: 700 }),
      });
      return result.toUIMessageStreamResponse({
        headers: { "Cache-Control": "no-store" },
        onError: () => "The assistant lost its model connection. Please try again.",
      });
    }

    return Response.json({ error: "Select a valid design action." }, { status: 400 });
  } catch (error) {
    return safeErrorResponse(error);
  }
}
